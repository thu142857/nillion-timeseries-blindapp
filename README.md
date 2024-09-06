# Nillion Coin trend prediction Blindapp

## Introduction
This app leverages Nillion's technology and Nada programing to enable secure and private model execution. Users can upload their models, use them without revealing any sensitive data, and pay based on usage.

## Key features
### Secure Bin:
Utilizing the Nada program, the app ensures that all data run securely, ensuring that sensitive data stays private and encrypted throughout the process.

### Upload Your Model:
Users are able to upload the custom Prophet models and pay as they use/run for secure computations.

### MPC-Powered Security:
By using Nillion's MPC, computations are distributed among multiple nodes, enhancing security while ensuring the model's confidentiality.

## How it works

### Model Upload:

- Users can upload their machine learning models in supported formats.
- Models are encrypted and stored using Nillion's distributed network.

### Secure Model Execution:

- Users can submit input data to run computations on their uploaded models.
- All computations are performed securely using MPC, ensuring that no party, including the network, can access the model or data.

### Pay Per Use:

After each computation, the system calculates the usage based on resource consumption.
Users are billed based on the time and computational resources used.

## Requirements

Before you begin, you need to install the following tools:

- `nilup`, an installer and version manager for the [Nillion SDK tools](https://docs.nillion.com/nillion-sdk-and-tools). Install nilup:

  _For the security-conscious, please download the `install.sh` script, so that you can inspect how
  it works, before piping it to `bash`._

  ```
  curl https://nilup.nilogy.xyz/install.sh | bash
  ```

  - Confirm `nilup` installation
    ```
    nilup -V
    ```

- [Nillion SDK tools](https://docs.nillion.com/nillion-sdk-and-tools) Use `nilup` to install these:
  ```bash
  nilup install latest
  nilup use latest
  nilup init
  ```
  - Confirm global Nillion tool installation
    ```
    nillion -V
    ```
- [Node (>= v18.17)](https://nodejs.org/en/download/)

  - Check version with
    ```
    node -v
    ```

- [python3](https://www.python.org/downloads/) version 3.11 or higher with a working [pip](https://pip.pypa.io/en/stable/getting-started/) installed

  - Confirm that you have python3 (version >=3.11) and pip installed:
    ```
    python3 --version
    python3 -m pip --version
    ```

- [Git](https://git-scm.com/downloads)

## Quickstart BlindApp

To get started, follow the steps below:

### 1. Clone this repo & install dependencies

```
git clone https://github.com/thu142857/nillion-timeseries-blindapp.git
cd nillion-timeseries-blindapp/coin-trend-prediction-blindapp
npm install
```

### 2. Run the Nillion devnet in the first terminal:

This bootstraps Nillion devnet, a local network of nodes and adds cluster info to your ReactJS app .env file

```
nillion-devnet --seed my-seed
```

### 3. Open one more terminal to start your ReactJS web app:

```
npm start
```

### 4. Visit your app on: `http://localhost:8080`.

## Quickstart Python Nada Program

To get started, follow the steps below:

### 1. Go to python project

```
cd nillion-timeseries-blindapp/timeseries-predict
python3 -m venv .venv
```

### 2. Run environment

```
source .venv/bin/active
pip install nada_ai flask 'flask[async]' cosmpy joblib asyncio flask_cors numpy pandas
```

### 3. Run nada program

```
python3 main.py
```

### 4. Or run Backend Server

```
python3 backend.py
```
# Support

If you encounter any issues or have any questions, feel free to contact our support me via `trananhthu142857@gmail.com` or `daningyn@t4e.xyz`
