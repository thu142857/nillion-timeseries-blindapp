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
from common import compute, store_program, store_secrets
from cosmpy.aerial.client import LedgerClient
from cosmpy.aerial.wallet import LocalWallet
from cosmpy.crypto.keypairs import PrivateKey
from dotenv import load_dotenv
from nillion_python_helpers import (create_nillion_client,
                                    create_payments_config)
from prophet import Prophet
from py_nillion_client import NodeKey, UserKey

from nada_ai.client import ProphetClient

home = os.getenv("HOME")
load_dotenv(f"{home}/.config/nillion/nillion-devnet.env")

# Load model
loaded_model = joblib.load('ETH_Predictation_1h.pkl')


async def main() -> None:
    """Main nada program"""

    cluster_id = os.getenv("NILLION_CLUSTER_ID")
    grpc_endpoint = os.getenv("NILLION_NILCHAIN_GRPC")
    chain_id = os.getenv("NILLION_NILCHAIN_CHAIN_ID")
    seed = "my_coin_predict_seed"
    userkey = UserKey.from_seed((seed))
    nodekey = NodeKey.from_seed((seed))
    client = create_nillion_client(userkey, nodekey)
    party_id = client.party_id
    user_id = client.user_id

    program_name = "coin_predict"
    program_mir_path = f"target/{program_name}.nada.bin"

    # Configure payments
    payments_config = create_payments_config(chain_id, grpc_endpoint)
    payments_client = LedgerClient(payments_config)
    payments_wallet = LocalWallet(
        PrivateKey(bytes.fromhex(os.getenv("NILLION_NILCHAIN_PRIVATE_KEY_0"))),
        prefix="nillion",
    )

    # Store program
    program_id = await store_program(
        client,
        payments_wallet,
        payments_client,
        user_id,
        cluster_id,
        program_name,
        program_mir_path,
    )

    # Create and store model secrets via ModelClient
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

    print(f"Stored model secrets with store_id: {model_store_id}")

    # Store inputs to perform inference for
    time_horizon = 5

    future_df = loaded_model.make_future_dataframe(periods=1)
    inference_ds = loaded_model.setup_dataframe(future_df.copy())

    print(f"Using inference data: {future_df}")

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

    # Set up the compute bindings for the parties
    compute_bindings = nillion.ProgramBindings(program_id)

    compute_bindings.add_input_party("ModelProvider", party_id)
    compute_bindings.add_input_party("UserProvider", party_id)
    compute_bindings.add_output_party("UserProvider", party_id)

    print(f"Computing using program {program_id}")
    print(f"Use secret store_id: {model_store_id} {data_store_id}")

    # Create a computation time secret to use
    computation_time_secrets = nillion.NadaValues({})

    # Compute, passing all params including the receipt that shows proof of payment
    result = await compute(
        client,
        payments_wallet,
        payments_client,
        program_id,
        cluster_id,
        compute_bindings,
        [model_store_id, data_store_id],
        computation_time_secrets,
        verbose=True,
    )
    # Sort & rescale the obtained results by the quantization scale
    outputs = [
        na_client.float_from_rational(result[1])
        for result in sorted(
            result.items(),
            key=lambda x: int(x[0].replace("coin_predict_output", "").replace("_", "")),
        )
    ]

    print(f"🖥️  The processed result is {outputs} @ {na.get_log_scale()}-bit precision")


if __name__ == "__main__":
    asyncio.run(main())