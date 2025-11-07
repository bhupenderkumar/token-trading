import base64
from solders.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed
from solana.transaction import Transaction
from solana.publickey import PublicKey
from solana.system_program import TransferParams, transfer
from backend.settings import settings

LAMPORTS_PER_SOL = 1_000_000_000

def direct_sol_transfer(to_address: str, amount_sol: float) -> str:
	"""
	Directly transfer SOL to another address using Solana RPC.
	Returns transaction signature.
	"""
	# ...rest of code from direct_sol_transfer.py...
