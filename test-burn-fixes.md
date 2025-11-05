# Token Burn Fix Testing Guide

## Overview
This guide helps test the fixes implemented for the token burn error (-32603) on localnet and devnet.

## Fixes Implemented

### 1. Enhanced Error Handling & Retry Logic
- **TokenBurn.tsx**: Added comprehensive retry mechanism with exponential backoff
- **wallet.ts**: Improved wallet validation with retry logic for RPC calls
- **connection.ts**: New resilient connection utility with automatic failover

### 2. Connection Improvements
- **config.ts**: Added backup RPC endpoints and optimized connection settings
- **WalletContextProvider.tsx**: Enhanced connection configuration with timeout handling

### 3. Transaction Optimization
- Increased compute unit limits (200,000 units)
- Higher priority fees (100,000 microLamports)
- Better blockhash management with 'confirmed' commitment
- Improved transaction confirmation with timeout handling

## Testing Steps

### Prerequisites
1. Ensure you have a wallet with some SOL for transaction fees
2. Have a token to burn (create one if needed using the mint feature)

### Test on Localnet
1. Start local Solana validator:
   ```bash
   solana-test-validator --reset
   ```

2. Configure wallet for localnet:
   ```bash
   solana config set --url localhost
   solana airdrop 2
   ```

3. Test token burn with various scenarios:
   - Small amounts (0.1 tokens)
   - Medium amounts (10 tokens)
   - Large amounts (1000 tokens)

### Test on Devnet
1. Configure wallet for devnet:
   ```bash
   solana config set --url devnet
   solana airdrop 2
   ```

2. Test token burn operations

### Expected Improvements
- **Reduced -32603 errors**: Automatic retry and failover should handle most RPC issues
- **Better error messages**: More informative error descriptions
- **Faster recovery**: Automatic switching to backup RPC endpoints
- **Higher success rate**: Optimized transaction parameters

### Monitoring
Watch the browser console for:
- Retry attempts: `"Retrying with next endpoint in Xms..."`
- Connection switches: `"Switched to backup RPC endpoint: ..."`
- Error details: Detailed logging for debugging

### Common Issues & Solutions

#### Issue: Still getting -32603 errors
**Solution**: The fix includes automatic retries. If errors persist:
1. Check network connectivity
2. Try reducing burn amount
3. Wait a few minutes for network congestion to clear

#### Issue: Transaction timeout
**Solution**: 
1. The timeout is set to 30 seconds
2. Transaction may still succeed - check wallet
3. Retry with smaller amounts

#### Issue: Insufficient SOL
**Solution**:
1. Run `solana airdrop 2` 
2. The app will attempt automatic airdrop on localnet

## Debugging

### Enable Detailed Logging
Open browser console to see:
- RPC health checks
- Retry attempts
- Connection failovers
- Transaction details

### Network Status
Check if RPC endpoints are healthy:
- Localnet: http://127.0.0.1:8899/health
- Devnet: https://api.devnet.solana.com (should return JSON)

## Rollback Plan
If issues persist, the changes are isolated to:
- `src/components/TokenBurn.tsx`
- `src/utils/wallet.ts`
- `src/utils/connection.ts` (new file)
- `src/config/config.ts`
- `src/WalletContextProvider.tsx`

Original functionality can be restored by reverting these files.