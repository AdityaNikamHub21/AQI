# model.py

import numpy as np
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.preprocessing import MinMaxScaler
import os

def create_sequences(data, window_size):
    X, y = [], []
    for i in range(len(data) - window_size):
        X.append(data[i:i+window_size])
        y.append(data[i+window_size])
    return np.array(X), np.array(y)

def build_model(input_shape):
    model = Sequential([
        # First LSTM layer with more neurons for better pattern recognition
        LSTM(128, return_sequences=True, input_shape=input_shape),
        Dropout(0.3),
        BatchNormalization(),
        
        # Second LSTM layer
        LSTM(64, return_sequences=True),
        Dropout(0.2),
        BatchNormalization(),
        
        # Third LSTM layer
        LSTM(32),
        Dropout(0.1),
        
        # Dense layers for better feature extraction
        Dense(64, activation='relu'),
        BatchNormalization(),
        Dropout(0.1),
        
        Dense(32, activation='relu'),
        BatchNormalization(),
        
        Dense(16, activation='relu'),
        Dense(1)
    ])
    
    # Use a lower learning rate for better convergence
    from tensorflow.keras.optimizers import Adam
    model.compile(optimizer=Adam(learning_rate=0.001), loss="mse")
    return model

def train_model(df, model_path, window_size=72, epochs=100):
    values = df["aqi"].values.reshape(-1,1)

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(values)

    X, y = create_sequences(scaled, window_size)
    
    # Split data for validation (use 85/15 split for more training data)
    split_idx = int(0.85 * len(X))
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    model = build_model((window_size, 1))
    
    # Enhanced callbacks for better training
    early_stopping = EarlyStopping(
        monitor='val_loss', 
        patience=15,  # More patience for better convergence
        restore_best_weights=True,
        verbose=1
    )
    
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss', 
        factor=0.5, 
        patience=8,  # More patience
        min_lr=0.00001,  # Lower minimum learning rate
        verbose=1
    )
    
    # Train with validation and batch size optimization
    history = model.fit(
        X_train, y_train, 
        validation_data=(X_val, y_val),
        epochs=epochs, 
        batch_size=64,  # Larger batch size for better gradient estimation
        verbose=1,
        callbacks=[early_stopping, reduce_lr],
        shuffle=True  # Shuffle training data for better generalization
    )

    # Save in native Keras format to avoid compatibility issues
    model.save(model_path.replace('.h5', '.keras'))

    return model, scaler, history

def load_existing_model(model_path):
    # Try to load .keras format first, then .h5
    keras_path = model_path.replace('.h5', '.keras')
    if os.path.exists(keras_path):
        return load_model(keras_path)
    elif os.path.exists(model_path):
        return load_model(model_path)
    return None
