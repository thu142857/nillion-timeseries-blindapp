from typing import List

import nada_numpy as na
import numpy as np
from nada_dsl import *

from nada_ai.time_series import Prophet

def nada_main() -> List[Output]:
    """
    Main Nada program.

    Returns:
        List[Output]: Program outputs.
    """
    # Create "ModelProvider" and "UserProvider"
    # In this examples ModelProvider provides the model and UserProvider runs inference
    modelProvider = Party(name="ModelProvider")
    userProvider = Party(name="UserProvider")

    TIME_HORIZON = 24

    # Instantiate model object
    model = Prophet(
        n_changepoints=12,  
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=True,
    )

    #  Load model weights from Nillion network
    model.load_state_from_network("coin_predict_model", modelProvider, na.SecretRational)

    # Load input data to be used for inference (provided by UserProvider)
    floor = na.array((TIME_HORIZON,), userProvider, "floor", na.SecretRational)
    t = na.array((TIME_HORIZON,), userProvider, "t", na.SecretRational)

    # Compute inference
    result = model.predict_trend(floor, t)

    # Produce the output for userProvider and variable name "coin_predict_output"
    return result.output(userProvider, "coin_predict_output")
