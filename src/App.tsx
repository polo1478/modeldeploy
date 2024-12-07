import React, { useEffect, useState } from 'react';
import {
  styled,
  useTheme,
  Theme,
  CSSObject
} from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Container,
  Tabs,
  Tab,
  Paper,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import {
  Menu as MenuIcon,
  Visibility
} from '@mui/icons-material';

const drawerWidth = 250;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: '#1a237e',
  color: 'white',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  backgroundColor: '#1a237e',
  color: 'white',
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: 'white',
  color: 'black',
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

interface Variable {
  id: number;
  name: string;
  type: string;
  description: string;
}

interface OptimizationResult {
  id: number;
  timestamp: string;
  y_variable_name: string;
  x_variables: Record<string, number>;
  parameters: Record<string, any>;
  result: Record<string, any>;
  score?: number;
  feature_importance?: Record<string, number>;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const App: React.FC = () => {
  // const theme = useTheme();  // 删除未使用的变量
  const [open, setOpen] = React.useState(true);
  const [tabValue, setTabValue] = React.useState(2);
  const [yVariables, setYVariables] = useState<Variable[]>([]);
  const [xVariables, setXVariables] = useState<Variable[]>([]);
  const [selectedY, setSelectedY] = useState<string>('');
  const [selectedXs, setSelectedXs] = useState<string[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelTrained, setModelTrained] = useState(false);
  const [featureImportance, setFeatureImportance] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Starting data fetch...');
        console.log('API Base URL:', API_BASE_URL);

        // Fetch Y variables
        console.log('Fetching Y variables...');
        const yResponse = await fetch(`${API_BASE_URL}/api/variables/Y`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('Y variables response status:', yResponse.status);
        
        if (!yResponse.ok) {
          const errorText = await yResponse.text();
          throw new Error(`Y variables HTTP error! status: ${yResponse.status}, message: ${errorText}`);
        }
        
        const yData = await yResponse.json();
        console.log('Y variables data:', yData);
        setYVariables(yData);

        // Fetch X variables
        console.log('Fetching X variables...');
        const xResponse = await fetch(`${API_BASE_URL}/api/variables/X`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('X variables response status:', xResponse.status);
        
        if (!xResponse.ok) {
          const errorText = await xResponse.text();
          throw new Error(`X variables HTTP error! status: ${xResponse.status}, message: ${errorText}`);
        }
        
        const xData = await xResponse.json();
        console.log('X variables data:', xData);
        setXVariables(xData);

        // Fetch optimization results
        console.log('Fetching optimization results...');
        const resultsResponse = await fetch(`${API_BASE_URL}/api/optimization`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('Optimization results response status:', resultsResponse.status);
        
        if (!resultsResponse.ok) {
          const errorText = await resultsResponse.text();
          throw new Error(`Optimization results HTTP error! status: ${resultsResponse.status}, message: ${errorText}`);
        }
        
        const resultsData = await resultsResponse.json();
        console.log('Optimization results data:', resultsData);
        setOptimizationResults(resultsData);

      } catch (error: unknown) {
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.name : typeof error
        });
        alert(`データの取得中にエラーが発生しました。\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}\nサーバーが起動していることを確認してください。`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTrainModel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data.success) {
        setModelTrained(true);
        alert('モデルのトレーニングが完了しました。スコア: ' + data.score.toFixed(3));
      } else {
        alert('トレーニングエラー: ' + data.message);
      }
    } catch (error) {
      console.error('Error training model:', error);
      alert('モデルのトレーニング中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimization = async () => {
    if (!selectedY || selectedXs.length === 0) {
      alert('Y変数とX変数を選択してください。');
      return;
    }

    setIsLoading(true);
    try {
      // Define parameter ranges
      const ranges = {
        '温度': [50, 150],    // 50-150°C
        '圧力': [1, 10],      // 1-10 MPa
        '触媒量': [0.1, 2.0], // 0.1-2.0 g
        '反応時間': [1, 24]    // 1-24 h
      };

      const response = await fetch(`${API_BASE_URL}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          y_variable: parseInt(selectedY),
          ranges: ranges
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh optimization results
        const updatedResultsResponse = await fetch(`${API_BASE_URL}/api/optimization`);
        const updatedResults = await updatedResultsResponse.json();
        setOptimizationResults(updatedResults);
        
        // Show feature importance if available
        if (data.feature_importance) {
          setFeatureImportance(data.feature_importance);
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error during optimization:', error);
      alert('最適化中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <StyledAppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="inherit">田上</Button>
            <Button variant="contained" color="inherit">解太</Button>
            <Button variant="contained" color="error">ログアウト</Button>
          </Box>
        </Toolbar>
      </StyledAppBar>
      <StyledDrawer variant="permanent" open={open}>
        <DrawerHeader>
          <Typography variant="h6">
            Datachemical LAB
          </Typography>
        </DrawerHeader>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="材料設計" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="分子設計" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton selected>
              <ListItemText primary="プロセス設計" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon sx={{ color: 'white' }}>
                <Visibility />
              </ListItemIcon>
              <ListItemText primary="データ表示" />
            </ListItemButton>
          </ListItem>
          {/* Add other menu items */}
        </List>
      </StyledDrawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        <Container>
          <Typography variant="h5" gutterBottom>
            MI-MI予測ベイズ最適化
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="予想データ" />
            <Tab label="予測データ" />
            <Tab label="MI予測ベイズ最適化" />
          </Tabs>

          <Paper sx={{ p: 3, mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Typography>目的変数Y</Typography>
              <Select
                value={selectedY}
                onChange={(e) => setSelectedY(e.target.value as string)}
              >
                {yVariables.map((variable) => (
                  <MenuItem key={variable.id} value={variable.id}>
                    {variable.name} - {variable.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Typography>説明変数X</Typography>
              <Select
                multiple
                value={selectedXs}
                onChange={(e) => setSelectedXs(typeof e.target.value === 'string' ? [e.target.value] : e.target.value as string[])}
              >
                {xVariables.map((variable) => (
                  <MenuItem key={variable.id} value={variable.id}>
                    {variable.name} - {variable.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Checkbox defaultChecked />}
              label="オートスケーリング"
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
              目標設定
            </Typography>

            <Box sx={{ mt: 2, mb: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleTrainModel}
                disabled={isLoading}
                sx={{ mr: 2 }}
              >
                {isLoading ? 'トレーニング中...' : 'モデルをトレーニング'}
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleOptimization}
                disabled={isLoading || !modelTrained}
              >
                {isLoading ? '���適化中...' : '最適化実行'}
              </Button>
            </Box>

            {featureImportance && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h6">特徴量重要度</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>変数</TableCell>
                        <TableCell>重要度</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(featureImportance).map(([feature, importance]) => (
                        <TableRow key={feature}>
                          <TableCell>{feature}</TableCell>
                          <TableCell>{(Number(importance) * 100).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {optimizationResults.length > 0 && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h6">最適化結果</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>日時</TableCell>
                        <TableCell>目的変数</TableCell>
                        <TableCell>予測値</TableCell>
                        <TableCell>信頼度</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {optimizationResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{new Date(result.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{result.y_variable_name}</TableCell>
                          <TableCell>{result.result.predicted_value?.toFixed(2) ?? 'N/A'}</TableCell>
                          <TableCell>{result.result.confidence?.toFixed(2) ?? 'N/A'}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default App;
