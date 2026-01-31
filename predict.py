# predict.py

import numpy as np
from sklearn.preprocessing import MinMaxScaler
from model import train_model, load_existing_model

def forecast_next_hours(df, model_path, hours=12, window_size=48, epochs=50):
    model = load_existing_model(model_path)

    # If no saved model, train
    scaler = MinMaxScaler()
    values = df["aqi"].values.reshape(-1,1)
    scaled = scaler.fit_transform(values)

    if model is None:
        model, scaler, history = train_model(df, model_path, window_size=window_size, epochs=epochs)
        
        # Print training metrics
        final_loss = history.history['loss'][-1]
        final_val_loss = history.history['val_loss'][-1]
        print(f"Training completed - Final Loss: {final_loss:.4f}, Val Loss: {final_val_loss:.4f}")

    # Get the last sequence for prediction
    if len(scaled) < window_size:
        # If not enough data, pad with the first value
        padding = np.full((window_size - len(scaled), 1), scaled[0])
        last_seq = np.vstack([padding, scaled])
    else:
        last_seq = scaled[-window_size:].copy()

    predictions_scaled = []

    # Make predictions step by step
    for _ in range(hours):
        pred = model.predict(last_seq.reshape(1, window_size, 1), verbose=0)[0][0]
        predictions_scaled.append(pred)
        # Update sequence for next prediction
        last_seq = np.append(last_seq[1:], [[pred]], axis=0)

    # Inverse transform to get actual AQI values
    predictions = scaler.inverse_transform(
        np.array(predictions_scaled).reshape(-1,1)
    ).flatten()

    return predictions
