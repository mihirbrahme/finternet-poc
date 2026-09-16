// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IParticipantRegistry {
    function isActiveAccount(address account) external view returns (bool);
}

contract CredentialRegistry {
    struct Eligibility {
        bool active;
        bool revoked;
        uint64 validUntil;
    }

    address public immutable admin;
    IParticipantRegistry public immutable participantRegistry;

    mapping(address => mapping(uint8 => Eligibility)) private eligibilityByAccountAndRole;

    event EligibilityUpdated(address indexed account, uint8 indexed role, bool active, uint64 validUntil);
    event EligibilityRevoked(address indexed account, uint8 indexed role);

    error NotAdmin();
    error InvalidAccount();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address participantRegistryAddress) {
        admin = msg.sender;
        participantRegistry = IParticipantRegistry(participantRegistryAddress);
    }

    function setEligibility(address account, uint8 role, bool active, uint64 validUntil) external onlyAdmin {
        if (account == address(0)) revert InvalidAccount();

        eligibilityByAccountAndRole[account][role] = Eligibility({
            active: active,
            revoked: false,
            validUntil: validUntil
        });

        emit EligibilityUpdated(account, role, active, validUntil);
    }

    function revokeEligibility(address account, uint8 role) external onlyAdmin {
        if (account == address(0)) revert InvalidAccount();

        Eligibility storage eligibility = eligibilityByAccountAndRole[account][role];
        eligibility.active = false;
        eligibility.revoked = true;

        emit EligibilityRevoked(account, role);
        emit EligibilityUpdated(account, role, false, eligibility.validUntil);
    }

    function hasValidRole(address account, uint8 role) external view returns (bool) {
        Eligibility storage eligibility = eligibilityByAccountAndRole[account][role];
        return participantRegistry.isActiveAccount(account)
            && eligibility.active
            && !eligibility.revoked
            && eligibility.validUntil > block.timestamp;
    }

    function getEligibility(address account, uint8 role) external view returns (bool active, bool revoked, uint64 validUntil) {
        Eligibility storage eligibility = eligibilityByAccountAndRole[account][role];
        return (eligibility.active, eligibility.revoked, eligibility.validUntil);
    }
}
