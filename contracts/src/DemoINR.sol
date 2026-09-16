// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDemoINRCredentialRegistry {
    function hasValidRole(address account, uint8 role) external view returns (bool);
}

contract DemoINR {
    uint8 public constant ROLE_RECOVERY_ORIGINATOR = 1;
    uint8 public constant ROLE_BUYER = 2;
    uint8 public constant ROLE_SPONSOR = 4;

    string public constant name = "Demo INR";
    string public constant symbol = "dINR";
    uint8 public constant decimals = 18;

    address public immutable treasury;
    IDemoINRCredentialRegistry public immutable credentialRegistry;
    bool public paused;
    uint256 public totalSupply;

    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    mapping(address => bool) public systemAccounts;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event SystemAccountUpdated(address indexed account, bool active);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    error NotTreasury();
    error PausedToken();
    error InvalidAccount();
    error InvalidAmount();
    error IneligibleHolder(address account);
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyTreasury() {
        if (msg.sender != treasury) revert NotTreasury();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedToken();
        _;
    }

    constructor(address credentialRegistryAddress) {
        if (credentialRegistryAddress == address(0)) revert InvalidAccount();
        treasury = msg.sender;
        credentialRegistry = IDemoINRCredentialRegistry(credentialRegistryAddress);
    }

    function mint(address to, uint256 amount) external onlyTreasury {
        if (amount == 0) revert InvalidAmount();
        _requireEligibleHolder(to);

        totalSupply += amount;
        balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyTreasury {
        if (from == address(0)) revert InvalidAccount();
        if (amount == 0) revert InvalidAmount();
        if (balances[from] < amount) revert InsufficientBalance();

        balances[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external whenNotPaused returns (bool) {
        if (spender == address(0)) revert InvalidAccount();
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external whenNotPaused returns (bool) {
        uint256 currentAllowance = allowances[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();
        allowances[from][msg.sender] = currentAllowance - amount;
        emit Approval(from, msg.sender, allowances[from][msg.sender]);

        _transfer(from, to, amount);
        return true;
    }

    function setSystemAccount(address account, bool active) external onlyTreasury {
        if (account == address(0)) revert InvalidAccount();
        systemAccounts[account] = active;
        emit SystemAccountUpdated(account, active);
    }

    function pause() external onlyTreasury {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyTreasury {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function balanceOf(address owner) external view returns (uint256) {
        return balances[owner];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (from == address(0) || to == address(0)) revert InvalidAccount();
        if (amount == 0) revert InvalidAmount();
        if (balances[from] < amount) revert InsufficientBalance();
        _requireEligibleHolder(from);
        _requireEligibleHolder(to);

        balances[from] -= amount;
        balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _requireEligibleHolder(address account) private view {
        if (account == address(0)) revert InvalidAccount();
        if (account == treasury || systemAccounts[account]) return;
        if (
            credentialRegistry.hasValidRole(account, ROLE_RECOVERY_ORIGINATOR)
                || credentialRegistry.hasValidRole(account, ROLE_BUYER)
                || credentialRegistry.hasValidRole(account, ROLE_SPONSOR)
        ) {
            return;
        }
        revert IneligibleHolder(account);
    }
}
