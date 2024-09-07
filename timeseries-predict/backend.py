from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import joblib

import nada_numpy as na
import nada_numpy.client as na_client
import numpy as np
import pandas as pd
import py_nillion_client as nillion
from common import compute, store_program, store_secrets, getQuote, uint8arrayToString
from cosmpy.aerial.client import LedgerClient
from cosmpy.aerial.wallet import LocalWallet
from cosmpy.crypto.keypairs import PrivateKey
from dotenv import load_dotenv
from nillion_python_helpers import (create_nillion_client,
                                    create_payments_config)
from prophet import Prophet
from py_nillion_client import NodeKey, UserKey
from random import randint

from nillion_python_helpers import get_quote

from nada_ai.client import ProphetClient

home = os.getenv("HOME")
load_dotenv(f"{home}/.config/nillion/nillion-devnet.env")

app = Flask(__name__)

CORS(app)

savedData = {}

@app.route('/api/store', methods=['POST'])
async def store():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and file.filename.endswith('.pkl'):
        try:
            # Load file
            file_stream = io.BytesIO(file.read())
            loaded_model = joblib.load(file_stream)

            cluster_id = os.getenv("NILLION_CLUSTER_ID")
            grpc_endpoint = os.getenv("NILLION_NILCHAIN_GRPC")
            chain_id = os.getenv("NILLION_NILCHAIN_CHAIN_ID")
            seed = "my_coin_predict_seed"
            userkey = UserKey.from_seed((seed))
            nodekey = NodeKey.from_seed((seed))
            client = create_nillion_client(userkey, nodekey)
            party_id = client.party_id
            user_id = client.user_id

            payments_config = create_payments_config(chain_id, grpc_endpoint)
            payments_client = LedgerClient(payments_config)
            payments_wallet = LocalWallet(
                PrivateKey(bytes.fromhex(os.getenv("NILLION_NILCHAIN_PRIVATE_KEY_0"))),
                prefix="nillion",
            )

            program_id = request.form.get('program_id')

            model_client = ProphetClient(loaded_model)
            model_secrets = nillion.NadaValues(
                model_client.export_state_as_secrets("coin_predict_model", na.SecretRational)
            )
            permissions = nillion.Permissions.default_for_user(client.user_id)
            permissions.add_compute_permissions({client.user_id: {program_id}})

            # Store model secrets
            model_store_id = await store_secrets(
                client,
                payments_wallet,
                payments_client,
                cluster_id,
                model_secrets,
                1,
                permissions,
            )

            hours = request.form.get('hours')
            future_df = loaded_model.make_future_dataframe(periods=1)
            inference_ds = loaded_model.setup_dataframe(future_df.copy())

            my_input = {}
            my_input.update(
                na_client.array(inference_ds["floor"].to_numpy(), "floor", na.SecretRational)
            )
            my_input.update(
                na_client.array(inference_ds["t"].to_numpy(), "t", na.SecretRational)
            )
            input_secrets = nillion.NadaValues(my_input)

            data_store_id = await store_secrets(
                client,
                payments_wallet,
                payments_client,
                cluster_id,
                input_secrets,
                1,
                permissions,
            )

            return jsonify({'message': 'Model loaded successfully!', 'model_store_id': model_store_id, 'data_store_id': data_store_id}), 200
        
        except Exception as e:
            return jsonify({'error': f'Failed to load model: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Only .pkl files are allowed.'}), 400

@app.route('/api/upload-model', methods=['POST'])
async def uploadModel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and file.filename.endswith('.pkl'):
        try:
            # Load file
            file_stream = io.BytesIO(file.read())
            loaded_model = joblib.load(file_stream)

            program_id = request.form.get('program_id')
            cluster_id = request.form.get('cluster_id')
            user_id = request.form.get('user_id')
            userkeyBase58 = request.form.get('user_key')

            defaultNodeKeySeed = f"nillion-testnet-seed-{randint(0, 9) + 1}"

            nodekey = NodeKey.from_seed(defaultNodeKeySeed)
            userkey = UserKey.from_base58(userkeyBase58)

            client = create_nillion_client(userkey, nodekey)

            model_client = ProphetClient(loaded_model)
            model_secrets = nillion.NadaValues(
                model_client.export_state_as_secrets("coin_predict_model", na.SecretRational)
            )
            permissions = nillion.Permissions.default_for_user(user_id)
            permissions.add_compute_permissions({user_id: {program_id}})

            operation = nillion.Operation.store_values(model_secrets, ttl_days=1)

            modelQuote = await getQuote(
                client, operation, cluster_id
            )

            if user_id not in savedData:
                savedData[user_id] = {}

            nonceString = uint8arrayToString(modelQuote.nonce)

            savedData[user_id][nonceString] = {
                'cluster_id': cluster_id,
                'secrets': model_secrets,
                'permissions': permissions,
                'client': client,
                'quote': modelQuote
            }
            savedData[user_id]['model'] = loaded_model 

            return jsonify({'message': 'Model upload successfully!', 'nonce': modelQuote.nonce, 'total': modelQuote.cost.total}), 200
        
        except Exception as e:
            return jsonify({'error': f'Failed to load model: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Only .pkl files are allowed.'}), 400

@app.route('/api/store-model', methods=['POST'])
async def storeModel():
    data = request.get_json()

    try:
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        txhash = data.get('txhash')
        user_id = data.get('user_id')
        nonce = data.get('nonce')
        nonceString = uint8arrayToString(nonce)

        userData = savedData[user_id][nonceString]

        client = userData['client']
        permissions = userData['permissions']
        secrets = userData['secrets']
        cluster_id = userData['cluster_id']
        quote = userData['quote']

        receipt = nillion.PaymentReceipt(quote, txhash)

        store_id = await client.store_values(cluster_id, secrets, permissions, receipt)

        return jsonify({'message': 'Model stored successfully!', 'store_id': store_id}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to store model: {str(e)}'}), 500

@app.route('/api/getquote-store-data', methods=['POST'])
async def getQuoteStoreData():
    data = request.get_json()

    try:
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_id = data.get('user_id')

        if not 'model' in savedData[user_id]:
            return jsonify({'error': 'No model uploaded'}), 400

        loaded_model = savedData[user_id]['model']
        program_id = data.get('program_id')
        cluster_id = data.get('cluster_id')
        userkeyBase58 = data.get('user_key')
        defaultNodeKeySeed = f"nillion-testnet-seed-{randint(0, 9) + 1}"
        hours = data.get('hours')

        nodekey = NodeKey.from_seed(defaultNodeKeySeed)
        userkey = UserKey.from_base58(userkeyBase58)

        client = create_nillion_client(userkey, nodekey)

        future_df = loaded_model.make_future_dataframe(periods=hours)
        inference_ds = loaded_model.setup_dataframe(future_df.copy())

        my_input = {}
        my_input.update(
            na_client.array(inference_ds["floor"].to_numpy(), "floor", na.SecretRational)
        )
        my_input.update(
            na_client.array(inference_ds["t"].to_numpy(), "t", na.SecretRational)
        )
        input_secrets = nillion.NadaValues(my_input)

        permissions = nillion.Permissions.default_for_user(user_id)
        permissions.add_compute_permissions({user_id: {program_id}})

        operation = nillion.Operation.store_values(input_secrets, ttl_days=1)

        dataQuote = await getQuote(
            client, operation, cluster_id
        )

        nonceString = uint8arrayToString(dataQuote.nonce)

        savedData[user_id][nonceString] = {
            'cluster_id': cluster_id,
            'secrets': input_secrets,
            'permissions': permissions,
            'client': client,
            'quote': dataQuote
        }

        return jsonify({'message': 'Get store secret data quote successfully!', 'nonce': dataQuote.nonce, 'total': dataQuote.cost.total}), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get quote: {str(e)}'}), 500

@app.route('/api/store-data', methods=['POST'])
async def storeData():
    data = request.get_json()

    try:
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        txhash = data.get('txhash')
        user_id = data.get('user_id')
        nonce = data.get('nonce')
        nonceString = uint8arrayToString(nonce)

        userData = savedData[user_id][nonceString]

        client = userData['client']
        permissions = userData['permissions']
        secrets = userData['secrets']
        cluster_id = userData['cluster_id']
        quote = userData['quote']

        receipt = nillion.PaymentReceipt(quote, txhash)

        store_id = await client.store_values(cluster_id, secrets, permissions, receipt)

        return jsonify({'message': 'Model stored successfully!', 'store_id': store_id}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to store data: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)
