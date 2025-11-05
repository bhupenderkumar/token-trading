export type Ethers = typeof import('ethers');

export async function loadEthersSafely(): Promise<Ethers | null> {
  try {
    const mod = await import('ethers');
    return mod as Ethers;
  } catch {
    return null;
  }
}

export function getInjectedProvider(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.ethereum || null;
}

export function formatEth(num: bigint, decimals = 18): string {
  try {
    const str = num.toString();
    const pad = decimals - str.length + 1;
    const whole = pad > 0 ? '0' : str.slice(0, -decimals);
    const frac = pad > 0 ? '0'.repeat(pad) + str : str.slice(-decimals);
    const trimmed = frac.replace(/0+$/, '') || '0';
    return `${whole}.${trimmed}`;
  } catch {
    return String(num);
  }
}

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  // Optional extensions many tokens use
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)'
];


