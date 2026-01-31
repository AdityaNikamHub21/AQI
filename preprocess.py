# preprocess.py

import pandas as pd
import numpy as np

def load_and_prepare_data(csv_path, city_name):
    """
    Load CSV and preprocess for a specific city.
    Required columns: timestamp, city, aqi
    """

    df = pd.read_csv(csv_path, parse_dates=["timestamp"])
    df = df[df["city"] == city_name]
    df = df.sort_values("timestamp")
    df = df.set_index("timestamp")

    # Select only numeric columns for resampling
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df = df[numeric_cols]

    # Resample hourly (using 'h' instead of deprecated 'H')
    df = df.resample("h").mean()

    # Fill missing AQI (fix pandas warning)
    df["aqi"] = df["aqi"].interpolate(method="linear")
    df.dropna(subset=["aqi"], inplace=True)

    return df
