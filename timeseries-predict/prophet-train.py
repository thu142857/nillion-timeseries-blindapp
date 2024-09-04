import pandas as pd
import numpy as np
np.float_ = np.float64
from prophet import Prophet
import joblib

columns = ['Open Time', 'Open', 'High', 'Low', 'Close', 'Volume', 'Close Time', 
           'Quote Asset Volume', 'Number of Trades', 'Taker Buy Base Asset Volume', 
           'Taker Buy Quote Asset Volume', 'Ignore']

datasetPath = '../dataset/ETHUSDT-1h-to-2-9.csv'

df = pd.read_csv(datasetPath)

df.columns = columns

# clean data
df['Open Time'] = pd.to_datetime(df['Open Time'], unit='ms')
df['Close'] = df['Close'].astype(float)

# Drop columns
df = df[['Open Time', 'Close']]
df.columns = ['ds', 'y']

print(df.head())

model = Prophet()

# Train
model.fit(df)

model_filename = 'ETH_Predictation_1h.pkl'
joblib.dump(model, model_filename)
print(f'Model saved to {model_filename}')
