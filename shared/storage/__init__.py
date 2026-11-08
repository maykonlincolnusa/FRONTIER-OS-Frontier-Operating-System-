"""
Project Frontier - Shared Storage Package
OCI Object Storage & Weight Loader integrations.
"""

from shared.storage.oci_weights_loader import OCIWeightsLoader, ensure_model_weights

__all__ = ["OCIWeightsLoader", "ensure_model_weights"]

