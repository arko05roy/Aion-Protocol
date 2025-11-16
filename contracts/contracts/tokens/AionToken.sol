// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AionToken
 * @notice TAO-equivalent emissions token for AIon Protocol
 * @dev ERC-20 token with minting and USDC swap capabilities
 */
contract AionToken is ERC20, Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant MAX_SUPPLY = 21_000_000 * 1e18; // 21 million tokens
    address public constant USDC_ADDRESS = 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E; // Avalanche USDC

    // State variables
    address public emissionsContract;
    mapping(address => bool) public minters;
    uint256 public totalBurned;
    
    // Swap pool state
    uint256 public usdcReserve;
    uint256 public tokenReserve;
    uint256 public constant SWAP_FEE = 30; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event SwappedToUSDC(address indexed user, uint256 tokenAmount, uint256 usdcAmount);
    event SwappedFromUSDC(address indexed user, uint256 usdcAmount, uint256 tokenAmount);
    event LiquidityAdded(uint256 tokenAmount, uint256 usdcAmount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    // Modifiers
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == emissionsContract, "Not authorized minter");
        _;
    }

    constructor() ERC20("AIon Token", "AION") Ownable(msg.sender) {
        // Initial supply for liquidity bootstrapping
        _mint(msg.sender, 1_000_000 * 1e18); // 1M tokens for initial liquidity
    }

    /**
     * @notice Set emissions contract address
     * @param _emissionsContract Emissions contract address
     */
    function setEmissionsContract(address _emissionsContract) external onlyOwner {
        require(_emissionsContract != address(0), "Invalid address");
        emissionsContract = _emissionsContract;
        minters[_emissionsContract] = true;
        emit MinterAdded(_emissionsContract);
    }

    /**
     * @notice Add authorized minter
     * @param minter Address to authorize
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid address");
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @notice Remove authorized minter
     * @param minter Address to remove
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @notice Mint new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit Burned(msg.sender, amount);
    }

    /**
     * @notice Swap AION tokens for USDC
     * @param tokenAmount Amount of AION tokens to swap
     * @return usdcOut Amount of USDC received
     */
    function swapToUSDC(uint256 tokenAmount) external nonReentrant returns (uint256 usdcOut) {
        require(tokenAmount > 0, "Invalid amount");
        require(usdcReserve > 0 && tokenReserve > 0, "Liquidity not initialized");
        
        // Calculate output amount with constant product formula
        uint256 tokenAmountWithFee = tokenAmount * (FEE_DENOMINATOR - SWAP_FEE);
        usdcOut = (tokenAmountWithFee * usdcReserve) / (tokenReserve * FEE_DENOMINATOR + tokenAmountWithFee);
        
        require(usdcOut > 0 && usdcOut < usdcReserve, "Insufficient output");

        // Transfer tokens from user
        _transfer(msg.sender, address(this), tokenAmount);
        
        // Update reserves
        tokenReserve += tokenAmount;
        usdcReserve -= usdcOut;

        // Transfer USDC to user (in production, use IERC20 interface)
        // IERC20(USDC_ADDRESS).transfer(msg.sender, usdcOut);

        emit SwappedToUSDC(msg.sender, tokenAmount, usdcOut);
    }

    /**
     * @notice Swap USDC for AION tokens
     * @param usdcAmount Amount of USDC to swap
     * @return tokenOut Amount of AION tokens received
     */
    function swapFromUSDC(uint256 usdcAmount) external nonReentrant returns (uint256 tokenOut) {
        require(usdcAmount > 0, "Invalid amount");
        require(usdcReserve > 0 && tokenReserve > 0, "Liquidity not initialized");
        
        // Calculate output amount with constant product formula
        uint256 usdcAmountWithFee = usdcAmount * (FEE_DENOMINATOR - SWAP_FEE);
        tokenOut = (usdcAmountWithFee * tokenReserve) / (usdcReserve * FEE_DENOMINATOR + usdcAmountWithFee);
        
        require(tokenOut > 0 && tokenOut < tokenReserve, "Insufficient output");

        // Transfer USDC from user (in production, use IERC20 interface)
        // IERC20(USDC_ADDRESS).transferFrom(msg.sender, address(this), usdcAmount);
        
        // Update reserves
        usdcReserve += usdcAmount;
        tokenReserve -= tokenOut;

        // Transfer tokens to user
        _transfer(address(this), msg.sender, tokenOut);

        emit SwappedFromUSDC(msg.sender, usdcAmount, tokenOut);
    }

    /**
     * @notice Add liquidity to swap pool
     * @param tokenAmount Amount of AION tokens
     * @param usdcAmount Amount of USDC
     */
    function addLiquidity(uint256 tokenAmount, uint256 usdcAmount) external onlyOwner {
        require(tokenAmount > 0 && usdcAmount > 0, "Invalid amounts");

        // Transfer tokens from owner
        _transfer(msg.sender, address(this), tokenAmount);
        
        // Transfer USDC from owner (in production, use IERC20 interface)
        // IERC20(USDC_ADDRESS).transferFrom(msg.sender, address(this), usdcAmount);

        // Update reserves
        tokenReserve += tokenAmount;
        usdcReserve += usdcAmount;

        emit LiquidityAdded(tokenAmount, usdcAmount);
    }

    /**
     * @notice Get current reserves
     * @return token Token reserve
     * @return usdc USDC reserve
     */
    function getReserves() external view returns (uint256 token, uint256 usdc) {
        return (tokenReserve, usdcReserve);
    }

    /**
     * @notice Calculate swap output
     * @param inputAmount Input amount
     * @param inputReserve Input reserve
     * @param outputReserve Output reserve
     * @return output Output amount
     */
    function getAmountOut(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) external pure returns (uint256 output) {
        require(inputAmount > 0, "Invalid input");
        require(inputReserve > 0 && outputReserve > 0, "Invalid reserves");
        
        uint256 inputAmountWithFee = inputAmount * (FEE_DENOMINATOR - SWAP_FEE);
        output = (inputAmountWithFee * outputReserve) / (inputReserve * FEE_DENOMINATOR + inputAmountWithFee);
    }
}

