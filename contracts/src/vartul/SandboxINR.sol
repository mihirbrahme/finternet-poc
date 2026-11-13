// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVartulRegistry} from "./VartulTypes.sol";

/// @title SandboxINR (dINR)
/// @notice Sandbox settlement token for demonstration and testing. It is not legal tender,
/// a bank deposit, a CBDC, a stablecoin or redeemable value. Only eligible registered
/// accounts and authorised system contracts may hold it.
contract SandboxINR {
    string public constant name = "Sandbox Digital INR";
    string public constant symbol = "dINR";
    uint8 public constant decimals = 18;

    IVartulRegistry public immutable registry;
    address public issuer;
    bool public paused;
    uint256 public totalSupply;
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Paused(bool paused);

    error Denied();
    error InvalidInput();
    error NotEligible(address account);
    error InsufficientBalance();
    error InsufficientAllowance();
    error TokenPaused();

    constructor(address registryAddress, address initialIssuer) {
        if (registryAddress == address(0) || initialIssuer == address(0)) revert InvalidInput();
        registry = IVartulRegistry(registryAddress);
        issuer = initialIssuer;
    }

    modifier onlyIssuer() {
        if (msg.sender != issuer) revert Denied();
        _;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function mint(address to, uint256 amount) external onlyIssuer {
        if (!registry.isEligibleHolder(to)) revert NotEligible(to);
        totalSupply += amount;
        balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyIssuer {
        if (balances[from] < amount) revert InsufficientBalance();
        balances[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function setPaused(bool value) external onlyIssuer {
        paused = value;
        emit Paused(value);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowances[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance();
        if (allowed != type(uint256).max) allowances[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (paused) revert TokenPaused();
        if (!registry.isEligibleHolder(to)) revert NotEligible(to);
        if (balances[from] < amount) revert InsufficientBalance();
        balances[from] -= amount;
        balances[to] += amount;
        emit Transfer(from, to, amount);
    }
}
