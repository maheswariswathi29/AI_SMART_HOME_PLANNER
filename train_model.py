import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

import joblib


# Load Dataset

data = pd.read_csv("vizag_house_cost.csv")


print("Dataset Loaded")
print(data.head())


# Convert Text Data into Numbers

encoder = LabelEncoder()


text_columns = [
    "Location",
    "Material_Quality",
    "Interior_Type",
    "Parking",
    "Balcony",
    "Garden"
]


for column in text_columns:
    data[column] = encoder.fit_transform(data[column])


# Separate Input and Output

X = data.drop("Total_Cost", axis=1)

y = data["Total_Cost"]


# Split Dataset

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)


# Create Model

model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)


# Train

model.fit(
    X_train,
    y_train
)


# Prediction

prediction = model.predict(X_test)


# Accuracy

mae = mean_absolute_error(
    y_test,
    prediction
)


accuracy = r2_score(
    y_test,
    prediction
)


print("\nModel Training Completed")

print("Mean Absolute Error:", mae)

print("Accuracy:", accuracy*100)


# Save Model

joblib.dump(
    model,
    "model.pkl"
)


print("\nmodel.pkl Saved Successfully")
