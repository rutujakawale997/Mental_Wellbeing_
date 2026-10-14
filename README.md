# Student Mental Health Prediction

A machine learning project that predicts a student's **Mental Health Score** using social media usage, academic information, lifestyle factors, and other student-related features.

> This project is for educational purposes and is not a medical diagnostic system.

## 🎯 Objectives

- Analyze student social media usage and mental health data.
- Perform data cleaning and exploratory data analysis.
- Encode categorical features.
- Train and compare machine learning models.
- Evaluate model performance.
- Deploy the trained model using FastAPI/Flask.

## 📊 Dataset

The project uses the **Student Social Media and Mental Health Impact** dataset.

The dataset contains information related to:

- Gender
- Academic Level
- Country
- Social Media Usage
- Most Used Platform
- Purpose of Use
- Stress Level
- Lifestyle and mental health factors

**Target Variable:** Mental Health Score

## 🔄 Workflow

Data Collection → Data Cleaning → EDA → Feature Encoding → Train-Test Split → Model Training → Evaluation → Deployment

## 🤖 Machine Learning Models

- Linear Regression
- Random Forest Regressor
- RandomizedSearchCV for Hyperparameter Tuning

## 📈 Evaluation Metrics

- MAE
- RMSE
- R² Score

## 🛠️ Technologies Used

- Python
- Pandas
- NumPy
- Matplotlib
- Seaborn
- Scikit-learn
- FastAPI / Flask
- HTML/CSS

## 📁 Project Structure

```text
project/
├── dataset/
├── notebooks/
├── models/
├── templates/
├── main.py
├── requirements.txt
└── README.md
