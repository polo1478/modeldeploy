from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import os
import json
import logging

# 配置日志记录
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# 模型保存路径
MODEL_DIR = 'models'
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

# 示例训练数据
def generate_sample_data():
    """生成示例训练数据"""
    np.random.seed(42)
    n_samples = 100
    
    # 生成X变量数据
    # X1: 温度 (50-150°C)
    # X2: 圧力 (1-10 MPa)
    # X3: 触媒量 (0.1-2.0 g)
    # X4: 反応時間 (1-24 h)
    X = np.random.rand(n_samples, 4)
    X[:, 0] = X[:, 0] * 100 + 50  # 温度
    X[:, 1] = X[:, 1] * 9 + 1     # 圧力
    X[:, 2] = X[:, 2] * 1.9 + 0.1 # 触媒量
    X[:, 3] = X[:, 3] * 23 + 1    # 反応時間
    
    # 生成Y变量数据（収率）
    # 模拟一个非线性关系：収率 = f(温度, 圧力, 触媒量, 反応時間)
    Y = (0.4 * X[:, 0] + 0.3 * X[:, 1]**2 + 0.2 * X[:, 2] + 0.1 * X[:, 3]) / 100
    Y = Y * 100  # 转换为百分比
    Y = np.clip(Y, 0, 100)  # 限制在0-100%范围内
    
    return X, Y

# 训练模型
def train_model(X, y, model_name='yield_model'):
    """训练回归模型"""
    try:
        # 数据标准化
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # 分割训练集和测试集
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        # 训练随机森林模型
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # 保存模型和标准化器
        model_path = os.path.join(MODEL_DIR, f'{model_name}.joblib')
        scaler_path = os.path.join(MODEL_DIR, f'{model_name}_scaler.joblib')
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        # 计算测试集得分
        score = model.score(X_test, y_test)
        logging.info(f"模型训练完成，得分: {score}")
        return score
    except Exception as e:
        logging.error(f"训练过程中出现错误: {str(e)}")
        return None

# 加载模型
def load_model(model_name='yield_model'):
    """加载保存的模型和标准化器"""
    try:
        model_path = os.path.join(MODEL_DIR, f'{model_name}.joblib')
        scaler_path = os.path.join(MODEL_DIR, f'{model_name}_scaler.joblib')
        
        if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
            logging.error("模型文件不存在")
            return None, None
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        logging.info("模型加载成功")
        return model, scaler
    except Exception as e:
        logging.error(f"模型加载过程中出现错误: {str(e)}")
        return None, None

# API路由
@app.route('/api/ml/train', methods=['POST'])
def train():
    """训练模型API"""
    try:
        logging.info("开始训练模型...")
        # 在实际应用中，这里应该从请求中获取训练数据
        # 现在我们使用示例数据
        X, y = generate_sample_data()
        logging.info(f"生成的训练数据形状: X={X.shape}, y={y.shape}")
        
        score = train_model(X, y)
        if score is not None:
            return jsonify({
                'success': True,
                'message': 'Model trained successfully',
                'score': score
            })
        else:
            return jsonify({
                'success': False,
                'message': '训练失败'
            }), 500
    except Exception as e:
        logging.error(f"训练过程中出现错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"训练失败: {str(e)}"
        }), 500

@app.route('/api/ml/predict', methods=['POST'])
def predict():
    """预测API"""
    try:
        data = request.json
        if not data or 'features' not in data:
            logging.error("请求中没有提供特征数据")
            return jsonify({
                'success': False,
                'message': 'No features provided'
            }), 400
        
        # 加载模型
        model, scaler = load_model()
        if model is None or scaler is None:
            logging.error("模型文件不存在")
            return jsonify({
                'success': False,
                'message': 'Model not found. Please train the model first.'
            }), 404
        
        # 准备特征数据
        features = np.array(data['features']).reshape(1, -1)
        
        # 标准化特征
        features_scaled = scaler.transform(features)
        
        # 预测
        prediction = model.predict(features_scaled)[0]
        
        # 获取特征重要性
        feature_importance = dict(zip(
            ['温度', '圧力', '触媒量', '反応時間'],
            model.feature_importances_
        ))
        
        logging.info(f"预测完成，预测值: {prediction}")
        return jsonify({
            'success': True,
            'prediction': float(prediction),
            'feature_importance': feature_importance
        })
    except Exception as e:
        logging.error(f"预测过程中出现错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/ml/optimize', methods=['POST'])
def optimize():
    """优化API - 使用网格搜索找到最优参数"""
    try:
        data = request.json
        if not data or 'ranges' not in data:
            logging.error("请求中没有提供参数范围")
            return jsonify({
                'success': False,
                'message': 'No parameter ranges provided'
            }), 400
        
        # 加载模型
        model, scaler = load_model()
        if model is None or scaler is None:
            logging.error("模型文件不存在")
            return jsonify({
                'success': False,
                'message': 'Model not found. Please train the model first.'
            }), 404
        
        # 从请求中获取参数范围
        ranges = data['ranges']
        
        # 创建网格搜索点
        grid_points = 10
        grid = np.array(np.meshgrid(
            np.linspace(ranges['温度'][0], ranges['温度'][1], grid_points),
            np.linspace(ranges['圧力'][0], ranges['圧力'][1], grid_points),
            np.linspace(ranges['触媒量'][0], ranges['触媒量'][1], grid_points),
            np.linspace(ranges['反応時間'][0], ranges['反応時間'][1], grid_points)
        ))
        
        # 重塑网格点为特征矩阵
        X_grid = grid.reshape(4, -1).T
        
        # 标准化特征
        X_grid_scaled = scaler.transform(X_grid)
        
        # 预测所有网格点的值
        y_pred = model.predict(X_grid_scaled)
        
        # 找到最优点
        best_idx = np.argmax(y_pred)
        best_params = {
            '温度': float(X_grid[best_idx, 0]),
            '圧力': float(X_grid[best_idx, 1]),
            '触媒量': float(X_grid[best_idx, 2]),
            '反応時間': float(X_grid[best_idx, 3])
        }
        best_prediction = float(y_pred[best_idx])
        
        logging.info(f"优化完成，最优参数: {best_params}, 预测值: {best_prediction}")
        return jsonify({
            'success': True,
            'optimal_parameters': best_params,
            'predicted_yield': best_prediction
        })
    except Exception as e:
        logging.error(f"优化过程中出现错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    try:
        # 如果模型不存在，训练一个新模型
        if not os.path.exists(os.path.join(MODEL_DIR, 'yield_model.joblib')):
            logging.info("模型文件不存在，开始生成示例数据并训练新模型...")
            X, y = generate_sample_data()
            train_model(X, y)
            logging.info("初始模型训练完成")
        else:
            logging.info("找到现有模型文件")

        # 启动Flask应用
        logging.info("启动ML服务...")
        app.run(host='0.0.0.0', port=5001, debug=True)
    except Exception as e:
        logging.error(f"启动服务时发生错误: {str(e)}")
        raise
