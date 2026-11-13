// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ParticipantRegistry {
    struct Participant {
        bytes32 participantIdHash;
        address account;
        bool active;
        bool exists;
    }

    address public immutable admin;

    mapping(bytes32 => Participant) private participantsById;
    mapping(address => bytes32) private participantIdByAccount;

    event ParticipantRegistered(bytes32 indexed participantIdHash, address indexed account);
    event ParticipantAccountUpdated(bytes32 indexed participantIdHash, address indexed previousAccount, address indexed newAccount);
    event ParticipantStatusChanged(bytes32 indexed participantIdHash, address indexed account, bool active);

    error NotAdmin();
    error InvalidParticipantId();
    error InvalidAccount();
    error ParticipantAlreadyRegistered();
    error ParticipantNotFound();
    error AccountAlreadyBound();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerParticipant(bytes32 participantIdHash, address account) external onlyAdmin {
        if (participantIdHash == bytes32(0)) revert InvalidParticipantId();
        if (account == address(0)) revert InvalidAccount();
        if (participantsById[participantIdHash].exists) revert ParticipantAlreadyRegistered();
        if (participantIdByAccount[account] != bytes32(0)) revert AccountAlreadyBound();

        participantsById[participantIdHash] = Participant({
            participantIdHash: participantIdHash,
            account: account,
            active: true,
            exists: true
        });
        participantIdByAccount[account] = participantIdHash;

        emit ParticipantRegistered(participantIdHash, account);
        emit ParticipantStatusChanged(participantIdHash, account, true);
    }

    function updateParticipantAccount(bytes32 participantIdHash, address newAccount) external onlyAdmin {
        Participant storage participant = participantsById[participantIdHash];
        if (!participant.exists) revert ParticipantNotFound();
        if (newAccount == address(0)) revert InvalidAccount();
        if (participantIdByAccount[newAccount] != bytes32(0)) revert AccountAlreadyBound();

        address previousAccount = participant.account;
        delete participantIdByAccount[previousAccount];
        participant.account = newAccount;
        participantIdByAccount[newAccount] = participantIdHash;

        emit ParticipantAccountUpdated(participantIdHash, previousAccount, newAccount);
        emit ParticipantStatusChanged(participantIdHash, newAccount, participant.active);
    }

    function setParticipantStatus(bytes32 participantIdHash, bool active) external onlyAdmin {
        Participant storage participant = participantsById[participantIdHash];
        if (!participant.exists) revert ParticipantNotFound();

        participant.active = active;
        emit ParticipantStatusChanged(participantIdHash, participant.account, active);
    }

    function isActiveAccount(address account) external view returns (bool) {
        bytes32 participantIdHash = participantIdByAccount[account];
        if (participantIdHash == bytes32(0)) return false;

        Participant storage participant = participantsById[participantIdHash];
        return participant.exists && participant.active && participant.account == account;
    }

    function getParticipantIdHash(address account) external view returns (bytes32) {
        return participantIdByAccount[account];
    }

    function getParticipant(bytes32 participantIdHash) external view returns (bytes32, address, bool) {
        Participant storage participant = participantsById[participantIdHash];
        if (!participant.exists) revert ParticipantNotFound();
        return (participant.participantIdHash, participant.account, participant.active);
    }
}
