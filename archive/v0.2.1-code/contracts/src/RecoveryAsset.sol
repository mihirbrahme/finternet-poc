// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICredentialRoleRegistry {
    function hasValidRole(address account, uint8 role) external view returns (bool);
}

contract RecoveryAsset {
    uint8 public constant ROLE_TOKENISER = 5;

    struct VerifiedAsset {
        bytes32 evidenceRoot;
        bytes32 attestationHash;
        bool active;
    }

    address public immutable admin;
    ICredentialRoleRegistry public immutable credentialRegistry;

    mapping(bytes32 => VerifiedAsset) private verifiedAssetsByHash;
    mapping(uint256 => bytes32) public assetHashByTokenId;
    mapping(uint256 => string) private tokenUris;
    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => mapping(address => uint256)) private balances;
    mapping(uint256 => mapping(address => uint256)) private lockedBalances;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    event VerifiedAssetRecorded(bytes32 indexed assetIdHash, bytes32 indexed evidenceRoot, bytes32 indexed attestationHash);
    event URI(string value, uint256 indexed tokenId);
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 tokenId,
        uint256 value
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event AssetMinted(
        bytes32 indexed assetIdHash,
        uint256 indexed tokenId,
        address indexed to,
        uint256 quantity,
        string metadataUri,
        bytes32 evidenceRoot
    );
    event AssetLocked(address indexed owner, uint256 indexed tokenId, uint256 quantity, bytes32 indexed settlementId);
    event AssetUnlocked(address indexed owner, uint256 indexed tokenId, uint256 quantity, bytes32 indexed settlementId);

    error NotAdmin();
    error MissingTokeniserRole();
    error InvalidAccount();
    error InvalidQuantity();
    error InvalidToken();
    error AssetNotVerified();
    error VerificationMismatch();
    error TokenAlreadyMapped();
    error InsufficientUnlockedBalance();
    error NotOwnerOrApproved();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address credentialRegistryAddress) {
        if (credentialRegistryAddress == address(0)) revert InvalidAccount();
        admin = msg.sender;
        credentialRegistry = ICredentialRoleRegistry(credentialRegistryAddress);
    }

    function recordVerifiedAsset(
        bytes32 assetIdHash,
        bytes32 evidenceRoot,
        bytes32 attestationHash
    ) external onlyAdmin {
        if (assetIdHash == bytes32(0) || evidenceRoot == bytes32(0) || attestationHash == bytes32(0)) {
            revert AssetNotVerified();
        }

        verifiedAssetsByHash[assetIdHash] = VerifiedAsset({
            evidenceRoot: evidenceRoot,
            attestationHash: attestationHash,
            active: true
        });

        emit VerifiedAssetRecorded(assetIdHash, evidenceRoot, attestationHash);
    }

    function mintAsset(
        address to,
        uint256 tokenId,
        uint256 quantity,
        string memory metadataUri,
        bytes32 assetIdHash,
        bytes32 evidenceRoot
    ) external {
        if (!credentialRegistry.hasValidRole(msg.sender, ROLE_TOKENISER)) revert MissingTokeniserRole();
        if (to == address(0)) revert InvalidAccount();
        if (tokenId == 0) revert InvalidToken();
        if (quantity == 0) revert InvalidQuantity();

        VerifiedAsset memory verifiedAsset = verifiedAssetsByHash[assetIdHash];
        if (!verifiedAsset.active) revert AssetNotVerified();
        if (verifiedAsset.evidenceRoot != evidenceRoot) revert VerificationMismatch();

        bytes32 existingAssetHash = assetHashByTokenId[tokenId];
        if (existingAssetHash != bytes32(0) && existingAssetHash != assetIdHash) revert TokenAlreadyMapped();

        assetHashByTokenId[tokenId] = assetIdHash;
        balances[tokenId][to] += quantity;
        totalSupply[tokenId] += quantity;
        tokenUris[tokenId] = metadataUri;

        emit URI(metadataUri, tokenId);
        emit TransferSingle(msg.sender, address(0), to, tokenId, quantity);
        emit AssetMinted(assetIdHash, tokenId, to, quantity, metadataUri, evidenceRoot);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, uint256 quantity) external {
        if (from != msg.sender && !isApprovedForAll[from][msg.sender]) revert NotOwnerOrApproved();
        if (to == address(0)) revert InvalidAccount();
        if (quantity == 0) revert InvalidQuantity();
        if (availableBalanceOf(from, tokenId) < quantity) revert InsufficientUnlockedBalance();

        balances[tokenId][from] -= quantity;
        balances[tokenId][to] += quantity;

        emit TransferSingle(msg.sender, from, to, tokenId, quantity);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function lock(address owner, uint256 tokenId, uint256 quantity, bytes32 settlementId) external {
        if (owner != msg.sender && !isApprovedForAll[owner][msg.sender]) revert NotOwnerOrApproved();
        if (quantity == 0) revert InvalidQuantity();
        if (availableBalanceOf(owner, tokenId) < quantity) revert InsufficientUnlockedBalance();

        lockedBalances[tokenId][owner] += quantity;
        emit AssetLocked(owner, tokenId, quantity, settlementId);
    }

    function unlock(address owner, uint256 tokenId, uint256 quantity, bytes32 settlementId) external {
        if (owner != msg.sender && !isApprovedForAll[owner][msg.sender]) revert NotOwnerOrApproved();
        if (quantity == 0) revert InvalidQuantity();
        if (lockedBalances[tokenId][owner] < quantity) revert InsufficientUnlockedBalance();

        lockedBalances[tokenId][owner] -= quantity;
        emit AssetUnlocked(owner, tokenId, quantity, settlementId);
    }

    function balanceOf(address owner, uint256 tokenId) external view returns (uint256) {
        return balances[tokenId][owner];
    }

    function lockedBalanceOf(address owner, uint256 tokenId) external view returns (uint256) {
        return lockedBalances[tokenId][owner];
    }

    function availableBalanceOf(address owner, uint256 tokenId) public view returns (uint256) {
        return balances[tokenId][owner] - lockedBalances[tokenId][owner];
    }

    function uri(uint256 tokenId) external view returns (string memory) {
        return tokenUris[tokenId];
    }

    function getVerifiedAsset(bytes32 assetIdHash)
        external
        view
        returns (bytes32 evidenceRoot, bytes32 attestationHash, bool active)
    {
        VerifiedAsset memory verifiedAsset = verifiedAssetsByHash[assetIdHash];
        return (verifiedAsset.evidenceRoot, verifiedAsset.attestationHash, verifiedAsset.active);
    }
}
