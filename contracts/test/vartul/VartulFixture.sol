// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Attestation, Kinds, LotState, LotView, Roles} from "../../src/vartul/VartulTypes.sol";
import {VartulRegistry} from "../../src/vartul/VartulRegistry.sol";
import {VartulAttestations} from "../../src/vartul/VartulAttestations.sol";
import {SandboxINR} from "../../src/vartul/SandboxINR.sol";
import {RecoveryLotRegistry} from "../../src/vartul/RecoveryLotRegistry.sol";
import {ProgrammeEscrow} from "../../src/vartul/ProgrammeEscrow.sol";
import {PayoutRouter} from "../../src/vartul/PayoutRouter.sol";
import {VartulClaims} from "../../src/vartul/VartulClaims.sol";
import {MaterialSettlement} from "../../src/vartul/MaterialSettlement.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function addr(uint256) external pure returns (address);
    function sign(uint256, bytes32) external pure returns (uint8, bytes32, bytes32);
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function assume(bool) external pure;
}

/// @notice Deploys and wires a complete Vartul network for tests: the Murud coastal programme with
/// Aamhi as originator, Talvan Polymers as receiving facility, Nirikshan Assurance as verifier and
/// two CSR sponsors. Organisations other than Aamhi are fictional.
abstract contract VartulFixture {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 internal constant NET = keccak256("VARTUL-NETWORK");
    bytes32 internal constant AAMHI = keccak256("AAMHI");
    bytes32 internal constant TALVAN = keccak256("TALVAN-POLYMERS");
    bytes32 internal constant NIRIKSHAN = keccak256("NIRIKSHAN-ASSURANCE");
    bytes32 internal constant PRATIBIMB = keccak256("PRATIBIMB-ASSESSORS");
    bytes32 internal constant TIDEWELL = keccak256("TIDEWELL-FOODS-CSR");
    bytes32 internal constant NEELKANTH = keccak256("NEELKANTH-BANK-FOUNDATION");
    bytes32 internal constant GHATMATHA = keccak256("GHATMATHA-RECYCLERS");
    bytes32 internal constant MURUD_GP = keccak256("NANDGAON-GRAM-PANCHAYAT");
    bytes32 internal constant ROGUE = keccak256("UNAPPOINTED-VERIFIER");

    bytes32 internal constant PLASTIC_MLP = keccak256("MLP");
    bytes32 internal constant MURUD = keccak256("IN-MH-RAIGAD-MURUD");
    bytes32 internal constant PID = keccak256("PRG-MURUD-COASTAL-2026");
    bytes32 internal constant TERMS = keccak256("terms:murud-coastal-recovery-2026-27:v1");

    uint256 internal constant FAC_KEY = 0xF0;
    uint256 internal constant MRC_KEY = 0xA1;
    uint256 internal constant ORIG_KEY = 0xA2;
    uint256 internal constant FACILITY_KEY = 0xB1;
    uint256 internal constant VERIFIER_KEY = 0xC1;
    uint256 internal constant ROGUE_KEY = 0xC2;
    uint256 internal constant ASSESSOR_KEY = 0xC3;
    uint256 internal constant SPONSOR_A_KEY = 0xD1;
    uint256 internal constant SPONSOR_B_KEY = 0xD2;
    uint256 internal constant BUYER_KEY = 0xE1;
    uint256 internal constant PANCHAYAT_KEY = 0xE2;

    address internal fac;
    address internal mrc;
    address internal orig;
    address internal facility;
    address internal verifier;
    address internal rogue;
    address internal assessor;
    address internal sponsorA;
    address internal sponsorB;
    address internal buyer;
    address internal panchayat;
    address[3] internal saathi;

    VartulRegistry internal registry;
    VartulAttestations internal att;
    SandboxINR internal dinr;
    RecoveryLotRegistry internal lots;
    ProgrammeEscrow internal escrow;
    PayoutRouter internal router;
    VartulClaims internal claims;
    MaterialSettlement internal market;

    uint64 internal nonce;
    uint64 internal constant T0 = 1_780_000_000;

    function _deployNetwork() internal {
        vm.warp(T0);
        fac = vm.addr(FAC_KEY);
        mrc = vm.addr(MRC_KEY);
        orig = vm.addr(ORIG_KEY);
        facility = vm.addr(FACILITY_KEY);
        verifier = vm.addr(VERIFIER_KEY);
        rogue = vm.addr(ROGUE_KEY);
        assessor = vm.addr(ASSESSOR_KEY);
        sponsorA = vm.addr(SPONSOR_A_KEY);
        sponsorB = vm.addr(SPONSOR_B_KEY);
        buyer = vm.addr(BUYER_KEY);
        panchayat = vm.addr(PANCHAYAT_KEY);
        saathi = [address(0x5A01), address(0x5A02), address(0x5A03)];

        registry = new VartulRegistry(address(this));
        att = new VartulAttestations(address(registry));
        dinr = new SandboxINR(address(registry), address(this));
        lots = new RecoveryLotRegistry(address(registry), address(att));
        escrow = new ProgrammeEscrow(address(registry), address(att), address(dinr), address(lots));
        router = new PayoutRouter(address(dinr), address(lots), address(escrow));
        claims = new VartulClaims(address(registry), address(lots));
        market = new MaterialSettlement(address(registry), address(dinr), address(lots), address(claims));

        _participant(NET, fac);
        _participant(AAMHI, orig);
        _participant(TALVAN, facility);
        _participant(NIRIKSHAN, verifier);
        _participant(ROGUE, rogue);
        _participant(PRATIBIMB, assessor);
        _participant(TIDEWELL, sponsorA);
        _participant(NEELKANTH, sponsorB);
        _participant(GHATMATHA, buyer);
        _participant(MURUD_GP, panchayat);

        registry.setAccount(fac, NET, Roles.FACILITATOR | Roles.RELAYER, 0, keccak256("vc:fac"));
        registry.setAccount(address(this), NET, Roles.RELAYER, 0, keccak256("vc:relayer"));
        registry.setAccount(mrc, AAMHI, Roles.MRC_OPERATOR, 0, keccak256("vc:mrc"));
        registry.setAccount(orig, AAMHI, Roles.ORIGINATOR, 0, keccak256("vc:orig"));
        registry.setAccount(facility, TALVAN, Roles.FACILITY, 0, keccak256("vc:facility"));
        registry.setAccount(verifier, NIRIKSHAN, Roles.VERIFIER, 0, keccak256("vc:verifier"));
        registry.setAccount(rogue, ROGUE, Roles.VERIFIER, 0, keccak256("vc:rogue"));
        registry.setAccount(assessor, PRATIBIMB, Roles.ASSESSOR, 0, keccak256("vc:assessor"));
        registry.setAccount(sponsorA, TIDEWELL, Roles.SPONSOR, 0, keccak256("vc:sponsorA"));
        registry.setAccount(sponsorB, NEELKANTH, Roles.SPONSOR, 0, keccak256("vc:sponsorB"));
        registry.setAccount(buyer, GHATMATHA, Roles.BUYER, 0, keccak256("vc:buyer"));
        registry.setAccount(panchayat, MURUD_GP, Roles.PANCHAYAT, 0, keccak256("vc:gp"));
        for (uint256 i = 0; i < 3; i++) {
            registry.setAccount(saathi[i], AAMHI, Roles.COLLECTOR, 0, keccak256(abi.encode("vc:saathi", i)));
        }
        registry.setSystemAccount(address(escrow), true);
        registry.setSystemAccount(address(router), true);
        registry.setSystemAccount(address(market), true);

        vm.startPrank(fac);
        att.setWriter(address(lots), true);
        att.setWriter(address(escrow), true);
        lots.wire(address(escrow), address(market));
        escrow.wire(address(claims), address(router));
        claims.setAllocator(address(escrow), true);
        claims.setAllocator(address(market), true);
        vm.stopPrank();

        dinr.mint(sponsorA, 1_000_000 ether);
        dinr.mint(sponsorB, 1_000_000 ether);
        dinr.mint(buyer, 1_000_000 ether);
    }

    function _participant(bytes32 id, address treasury) internal {
        registry.setParticipant(id, true, treasury);
    }

    // ----- Programmes -----

    function _input(bytes32 id, uint8 policy, uint256 targetGrams, uint256 rate, uint256 shareA, uint256 shareB, uint64 window)
        internal
        view
        returns (ProgrammeEscrow.ProgrammeInput memory p)
    {
        address[] memory sponsors = new address[](2);
        uint256[] memory shares = new uint256[](2);
        sponsors[0] = sponsorA;
        sponsors[1] = sponsorB;
        shares[0] = shareA;
        shares[1] = shareB;
        p = ProgrammeEscrow.ProgrammeInput({
            id: id,
            termsHash: TERMS,
            originator: AAMHI,
            verifier: NIRIKSHAN,
            material: PLASTIC_MLP,
            region: MURUD,
            policy: policy,
            milestones: 4,
            collectorBps: 4000,
            verifierBps: 500,
            challengeWindow: window,
            deadline: uint64(block.timestamp + 180 days),
            grace: 30 days,
            targetGrams: targetGrams,
            ratePerKg: rate,
            sponsors: sponsors,
            shares: shares
        });
    }

    function _openProgramme(ProgrammeEscrow.ProgrammeInput memory p) internal {
        vm.prank(sponsorA);
        escrow.propose(p);
        vm.prank(sponsorA);
        dinr.approve(address(escrow), p.shares[0]);
        vm.prank(sponsorA);
        escrow.fund(p.id);
        vm.prank(sponsorB);
        dinr.approve(address(escrow), p.shares[1]);
        vm.prank(sponsorB);
        escrow.fund(p.id);
        vm.prank(orig);
        escrow.accept(p.id, TERMS);
    }

    /// @dev ₹18/kg, ₹21,240 budget (1,180 kg), 2-day challenge window.
    function _openPerKg(bytes32 id) internal {
        _openProgramme(_input(id, escrow.PER_KG_CAPPED(), 0, 18 ether, 15_000 ether, 6_240 ether, 2 days));
    }

    // ----- Attestations -----

    function _att(bytes32 kind, bytes32 subject, uint256 quantity, bytes32 ref) internal returns (Attestation memory a) {
        nonce++;
        a = Attestation({
            kind: kind,
            subject: subject,
            quantity: quantity,
            evidence: keccak256(abi.encode("evidence", kind, subject, nonce)),
            ref: ref,
            issuedAt: uint64(block.timestamp),
            nonce: nonce
        });
    }

    function _sign(uint256 key, Attestation memory a) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, att.digest(a));
        return abi.encodePacked(r, s, v);
    }

    // ----- Lots -----

    function _mintInput(bytes32 lotId, bytes32 pid, uint256[3] memory grams, uint256 contamination, uint256 aggregated)
        internal
        view
        returns (RecoveryLotRegistry.MintInput memory m)
    {
        address[] memory addrs = new address[](3);
        uint256[] memory g = new uint256[](3);
        uint256 input;
        for (uint256 i = 0; i < 3; i++) {
            addrs[i] = saathi[i];
            g[i] = grams[i];
            input += grams[i];
        }
        ProgrammeEscrow.Programme memory p = escrow.getProgramme(pid);
        m = RecoveryLotRegistry.MintInput({
            lotId: lotId,
            programmeId: pid,
            milestone: 1,
            material: PLASTIC_MLP,
            region: MURUD,
            windowStart: p.commitmentTime + 1,
            windowEnd: uint64(block.timestamp - 1),
            inputGrams: input,
            contaminationGrams: contamination,
            aggregatedGrams: aggregated,
            collectors: addrs,
            collectorGrams: g
        });
    }

    /// @dev The worked example: 1,240 kg captured, 60 kg contamination, 1,180 kg aggregated.
    function _mintStandard(bytes32 lotId, bytes32 pid) internal {
        vm.warp(block.timestamp + 7 days);
        RecoveryLotRegistry.MintInput memory m = _mintInput(lotId, pid, [uint256(500_000), 450_000, 290_000], 60_000, 1_180_000);
        Attestation memory a = _att(Kinds.AGGREGATION_WEIGH, lotId, m.aggregatedGrams, keccak256(abi.encode("proof", lotId)));
        lots.mintLot(m, a, _sign(MRC_KEY, a));
    }

    function _dispatch(bytes32 lotId) internal {
        Attestation memory a = _att(Kinds.DISPATCH, lotId, 0, keccak256("vehicle:MH06-AB-1234"));
        lots.dispatch(uint256(lotId), facility, a, _sign(ORIG_KEY, a));
    }

    function _receive(bytes32 lotId, uint256 grams) internal {
        Attestation memory a = _att(Kinds.RECEIPT, lotId, grams, keccak256("gate:talvan"));
        lots.confirmReceipt(uint256(lotId), a, _sign(FACILITY_KEY, a));
    }

    function _verify(bytes32 lotId, uint256 eligible) internal {
        RecoveryLotRegistry.Exclusion[] memory none = new RecoveryLotRegistry.Exclusion[](0);
        Attestation memory a = _att(Kinds.VERIFICATION, lotId, eligible, keccak256("report"));
        lots.verify(uint256(lotId), none, a, _sign(VERIFIER_KEY, a));
    }

    function _toVerified(bytes32 lotId, bytes32 pid) internal {
        _mintStandard(lotId, pid);
        _dispatch(lotId);
        _receive(lotId, 1_180_000);
        _verify(lotId, 1_180_000);
    }

    // ----- Assertions -----

    function assertEq(uint256 a, uint256 b, string memory what) internal pure {
        if (a != b) revert(string(abi.encodePacked(what, ": ", _str(a), " != ", _str(b))));
    }

    function assertTrue(bool c, string memory what) internal pure {
        if (!c) revert(what);
    }

    function _str(uint256 v) private pure returns (string memory) {
        if (v == 0) return "0";
        bytes memory b;
        while (v > 0) {
            b = abi.encodePacked(bytes1(uint8(48 + v % 10)), b);
            v /= 10;
        }
        return string(b);
    }

    function _state(bytes32 lotId) internal view returns (LotState) {
        return lots.getLot(uint256(lotId)).state;
    }
}
