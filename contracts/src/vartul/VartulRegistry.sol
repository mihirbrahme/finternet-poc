// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Roles} from "./VartulTypes.sol";

/// @title VartulRegistry
/// @notice Participants, their accounts, roles and treasury addresses. Role grants mirror
/// verifiable credentials issued off-ledger; `credential` records the credential fingerprint.
/// No personal data is stored: collectors are pseudonymous accounts.
contract VartulRegistry {
    struct Account {
        bytes32 participant;
        uint256 roles;
        uint64 validUntil;
        bool active;
        bytes32 credential;
    }

    address public facilitator;
    mapping(address => Account) private accounts;
    mapping(bytes32 => bool) public participantActive;
    mapping(bytes32 => address) private treasuries;
    mapping(address => bool) public systemAccount;

    event FacilitatorTransferred(address indexed previous, address indexed next);
    event ParticipantStatus(bytes32 indexed participant, bool active);
    event AccountSet(address indexed account, bytes32 indexed participant, uint256 roles, uint64 validUntil, bytes32 credential);
    event AccountSuspended(address indexed account);
    event TreasurySet(bytes32 indexed participant, address treasury);
    event SystemAccountSet(address indexed account, bool active);

    error Denied();
    error InvalidInput();

    modifier onlyFacilitator() {
        if (msg.sender != facilitator) revert Denied();
        _;
    }

    constructor(address initialFacilitator) {
        if (initialFacilitator == address(0)) revert InvalidInput();
        facilitator = initialFacilitator;
        emit FacilitatorTransferred(address(0), initialFacilitator);
    }

    function transferFacilitator(address next) external onlyFacilitator {
        if (next == address(0)) revert InvalidInput();
        emit FacilitatorTransferred(facilitator, next);
        facilitator = next;
    }

    function setParticipant(bytes32 participant, bool active, address treasury) external onlyFacilitator {
        if (participant == bytes32(0)) revert InvalidInput();
        participantActive[participant] = active;
        emit ParticipantStatus(participant, active);
        if (treasury != address(0)) {
            treasuries[participant] = treasury;
            emit TreasurySet(participant, treasury);
        }
    }

    function setAccount(address account, bytes32 participant, uint256 roles, uint64 validUntil, bytes32 credential)
        external
        onlyFacilitator
    {
        if (account == address(0) || participant == bytes32(0) || roles == 0) revert InvalidInput();
        Account storage existing = accounts[account];
        if (existing.participant != bytes32(0) && existing.participant != participant) revert InvalidInput();
        accounts[account] = Account(participant, roles, validUntil, true, credential);
        emit AccountSet(account, participant, roles, validUntil, credential);
    }

    function suspendAccount(address account) external onlyFacilitator {
        accounts[account].active = false;
        emit AccountSuspended(account);
    }

    function setSystemAccount(address account, bool active) external onlyFacilitator {
        systemAccount[account] = active;
        emit SystemAccountSet(account, active);
    }

    function hasRole(address account, uint256 role) public view returns (bool) {
        Account storage a = accounts[account];
        return a.active && (a.roles & role) != 0 && participantActive[a.participant]
            && (a.validUntil == 0 || a.validUntil >= block.timestamp);
    }

    function participantOf(address account) external view returns (bytes32) {
        return accounts[account].participant;
    }

    function treasuryOf(bytes32 participant) external view returns (address) {
        return treasuries[participant];
    }

    function getAccount(address account) external view returns (Account memory) {
        return accounts[account];
    }

    /// @notice Money may only be held by active registered accounts or authorised system contracts.
    function isEligibleHolder(address account) external view returns (bool) {
        if (systemAccount[account]) return true;
        Account storage a = accounts[account];
        return a.active && participantActive[a.participant];
    }

    /// @notice Convenience for clients: the facilitator role is the registry administrator.
    function isFacilitator(address account) external view returns (bool) {
        return account == facilitator || hasRole(account, Roles.FACILITATOR);
    }
}
