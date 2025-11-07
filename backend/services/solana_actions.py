import requests
import base64
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed
from spl.token.client import Token

from backend.settings import settings
from backend.jupiter_api import execute_jupiter_swap, jupiter_api

LAMPORTS_PER_SOL = 1_000_000_000

# ...rest of code from solana_actions.py...
