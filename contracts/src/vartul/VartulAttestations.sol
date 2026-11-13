// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Attestation, IVartulRegistry, Roles} from "./VartulTypes.sol";

/// @title VartulAttestations
/// @notice Verifies EIP-712 attestations signed by credentialed participants and records them.
/// Field participants never submit transactions themselves: a registered relayer submits their
/// signed statements. Revocation marks an attestation; dependent lots and claims observe it.
contract VartulAttestations {
    enum Status { NONE, ACTIVE, REVOKED }

    struct Record {
        address attester;
        bytes32 participant;
        bytes32 kind;
        bytes32 subject;
        uint256 quantity;
        bytes32 evidence;
        bytes32 ref;
        uint64 recordedAt;
        Status status;
    }

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(bytes32 kind,bytes32 subject,uint256 quantity,bytes32 evidence,bytes32 ref,uint64 issuedAt,uint64 nonce)"
    );
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    uint256 private constant MAX_S = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    IVartulRegistry public immutable registry;
    mapping(address => bool) public writers;
    mapping(bytes32 => uint256) public standaloneRole;
    mapping(bytes32 => Record) private records;

    event WriterSet(address indexed writer, bool allowed);
    event StandaloneKindSet(bytes32 indexed kind, uint256 role);
    event Attested(
        bytes32 indexed id, bytes32 indexed kind, bytes32 indexed subject, address attester, bytes32 participant,
        uint256 quantity, bytes32 evidence, bytes32 ref
    );
    event Revoked(bytes32 indexed id, address indexed by, bytes32 reason);

    error Denied();
    error BadSignature();
    error InvalidInput();
    error AlreadyRecorded();

    constructor(address registryAddress) {
        if (registryAddress == address(0)) revert InvalidInput();
        registry = IVartulRegistry(registryAddress);
    }

    modifier onlyFacilitator() {
        if (!registry.hasRole(msg.sender, Roles.FACILITATOR)) revert Denied();
        _;
    }

    function setWriter(address writer, bool allowed) external onlyFacilitator {
        writers[writer] = allowed;
        emit WriterSet(writer, allowed);
    }

    /// @notice Kinds that may be recorded without a lifecycle contract (e.g. Panchayat co-attestation).
    function setStandaloneKind(bytes32 kind, uint256 role) external onlyFacilitator {
        standaloneRole[kind] = role;
        emit StandaloneKindSet(kind, role);
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("Vartul"), keccak256("1"), block.chainid, address(this)));
    }

    function digest(Attestation calldata a) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(ATTESTATION_TYPEHASH, a.kind, a.subject, a.quantity, a.evidence, a.ref, a.issuedAt, a.nonce)
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    function record(Attestation calldata a, bytes calldata signature, uint256 requiredRole, address submitter)
        external
        returns (bytes32 id, address signer)
    {
        if (!writers[msg.sender]) revert Denied();
        return _record(a, signature, requiredRole, submitter);
    }

    function attestStandalone(Attestation calldata a, bytes calldata signature) external returns (bytes32 id) {
        uint256 role = standaloneRole[a.kind];
        if (role == 0) revert InvalidInput();
        (id,) = _record(a, signature, role, msg.sender);
    }

    function revoke(bytes32 id, bytes32 reason) external {
        Record storage r = records[id];
        if (r.status != Status.ACTIVE) revert InvalidInput();
        if (msg.sender != r.attester && !registry.hasRole(msg.sender, Roles.FACILITATOR)) revert Denied();
        r.status = Status.REVOKED;
        emit Revoked(id, msg.sender, reason);
    }

    function isRevoked(bytes32 id) external view returns (bool) {
        return records[id].status == Status.REVOKED;
    }

    function getRecord(bytes32 id) external view returns (Record memory) {
        return records[id];
    }

    function _record(Attestation calldata a, bytes calldata signature, uint256 requiredRole, address submitter)
        private
        returns (bytes32 id, address signer)
    {
        if (a.kind == bytes32(0) || a.subject == bytes32(0) || a.issuedAt > block.timestamp + 300) revert InvalidInput();
        id = digest(a);
        signer = _recover(id, signature);
        if (!registry.hasRole(signer, requiredRole)) revert Denied();
        if (submitter != signer && !registry.hasRole(submitter, Roles.RELAYER)) revert Denied();
        if (records[id].status != Status.NONE) revert AlreadyRecorded();
        bytes32 participant = registry.participantOf(signer);
        records[id] = Record(
            signer, participant, a.kind, a.subject, a.quantity, a.evidence, a.ref, uint64(block.timestamp), Status.ACTIVE
        );
        emit Attested(id, a.kind, a.subject, signer, participant, a.quantity, a.evidence, a.ref);
    }

    function _recover(bytes32 hash, bytes calldata signature) private pure returns (address signer) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > MAX_S) revert BadSignature();
        if (v < 27) v += 27;
        signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) revert BadSignature();
    }
}
