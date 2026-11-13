// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../src/SponsorshipEscrow.sol";
import "../src/DemoINR.sol";
import "../src/CredentialRegistry.sol";
import "../src/ParticipantRegistry.sol";

interface VmSponsorship { function prank(address) external; function expectRevert() external; }

contract SponsorshipEscrowTest {
    VmSponsorship constant vm = VmSponsorship(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant S = address(11); address constant A = address(12);
    address constant F = address(13); address constant V = address(14);
    bytes32 constant TERMS = keccak256("terms-v1");
    bytes32 constant EVIDENCE = keccak256("manifest-1");
    DemoINR money; SponsorshipEscrow escrow;

    function setUp() public {
        ParticipantRegistry p = new ParticipantRegistry();
        CredentialRegistry c = new CredentialRegistry(address(p));
        p.registerParticipant(keccak256("sponsor"), S); p.registerParticipant(keccak256("aamhi"), A);
        c.setEligibility(S, 4, true, uint64(block.timestamp + 365 days));
        c.setEligibility(A, 1, true, uint64(block.timestamp + 365 days));
        money = new DemoINR(address(c));
        escrow = new SponsorshipEscrow(address(money), S, A, F, V, keccak256("programme"));
        money.setSystemAccount(address(escrow), true); money.mint(S, 30000 ether);
        vm.prank(S); money.approve(address(escrow), 30000 ether);
        for (uint256 i = 1; i <= 3; i++) {
            vm.prank(S); escrow.createMilestone(i, TERMS, 10000 ether, 500);
            vm.prank(A); escrow.acceptTerms(i, TERMS);
            vm.prank(S); escrow.fund(i);
        }
    }
    function _outcome(uint256 id, bytes32 evidence, uint256 kg) private {
        vm.prank(A); escrow.submitEvidence(id, TERMS, evidence);
        vm.prank(F); escrow.confirmReceipt(id, evidence, kg);
        vm.prank(V); escrow.verify(id, evidence, kg);
    }
    function testVerifiedOutcomeReleasesFixedPaymentAndAttribution() public {
        _outcome(1, EVIDENCE, 500);
        require(escrow.getMilestone(1).closed, "Verification must settle automatically");
        require(money.balanceOf(A) == 10000 ether);
        require(escrow.attributionHash(1) != bytes32(0));
        vm.expectRevert(); escrow.release(1);
    }
    function testNoReleaseWithoutVerification() public { vm.expectRevert(); escrow.release(1); }
    function testWrongActorAndMismatchedEvidenceRejected() public {
        vm.expectRevert(); escrow.submitEvidence(1, TERMS, EVIDENCE);
        vm.prank(A); escrow.submitEvidence(1, TERMS, EVIDENCE);
        vm.expectRevert(); vm.prank(F); escrow.confirmReceipt(1, keccak256("other"), 500);
        vm.expectRevert(); vm.prank(S); escrow.verify(1, EVIDENCE, 500);
        vm.prank(F); escrow.confirmReceipt(1, EVIDENCE, 450);
        vm.expectRevert(); vm.prank(V); escrow.verify(1, EVIDENCE, 500);
    }
    function testShortfallNeedsBothApprovalsForExactProposal() public {
        _outcome(1, EVIDENCE, 450);
        vm.expectRevert(); escrow.release(1);
        vm.prank(A); escrow.proposeException(1, keccak256("accept-shortfall"), 10000 ether);
        bytes32 proposal = escrow.getMilestone(1).exceptionHash;
        vm.prank(S); escrow.approveException(1, proposal);
        vm.expectRevert(); escrow.release(1);
        vm.expectRevert(); vm.prank(A); escrow.approveException(1, keccak256("wrong"));
        vm.prank(A); escrow.approveException(1, proposal);
        require(escrow.getMilestone(1).closed, "Second approval must settle automatically");
        require(money.balanceOf(A) == 10000 ether);
    }
    function testRevisedProposalInvalidatesPriorApprovals() public {
        _outcome(1, EVIDENCE, 450);
        vm.prank(A); escrow.proposeException(1, keccak256("first"), 10000 ether);
        bytes32 proposal = escrow.getMilestone(1).exceptionHash;
        vm.prank(S); escrow.approveException(1, proposal);
        vm.prank(A); escrow.proposeException(1, keccak256("second"), 9000 ether);
        require(!escrow.getMilestone(1).sponsorApproved);
        vm.expectRevert(); escrow.release(1);
    }
    function testDisputeIsolationAndPartialPaymentRefund() public {
        _outcome(1, EVIDENCE, 450);
        vm.prank(S); escrow.dispute(1, keccak256("review"));
        _outcome(2, keccak256("manifest-2"), 500);
        vm.prank(A); escrow.proposeException(1, keccak256("agreement"), 8000 ether);
        bytes32 proposal = escrow.getMilestone(1).exceptionHash;
        vm.prank(S); escrow.approveException(1, proposal);
        vm.prank(A); escrow.approveException(1, proposal);
        require(money.balanceOf(S) == 2000 ether && money.balanceOf(A) == 18000 ether);
    }
    function testJointCancellationRefundsWithoutOutcomeClaim() public {
        vm.prank(S); escrow.proposeException(1, keccak256("cancel"), 0);
        bytes32 proposal = escrow.getMilestone(1).exceptionHash;
        vm.prank(S); escrow.approveException(1, proposal);
        vm.prank(A); escrow.approveException(1, proposal);
        require(money.balanceOf(S) == 10000 ether && escrow.attributionHash(1) == bytes32(0));
    }
    function testDuplicateManifestRejectedWithinProgramme() public {
        vm.prank(A); escrow.submitEvidence(1, TERMS, EVIDENCE);
        vm.expectRevert(); vm.prank(A); escrow.submitEvidence(2, TERMS, EVIDENCE);
    }
    function testNewDisputeInvalidatesExceptionApprovals() public {
        _outcome(1, EVIDENCE, 450);
        vm.prank(A); escrow.proposeException(1, keccak256("exception"), 10000 ether);
        bytes32 proposal = escrow.getMilestone(1).exceptionHash;
        vm.prank(S); escrow.approveException(1, proposal);
        vm.prank(V); escrow.dispute(1, keccak256("new concern"));
        require(!escrow.getMilestone(1).sponsorApproved, "Dispute must invalidate approval");
        vm.expectRevert(); escrow.release(1);
    }
    function testAutomaticPaymentFailureRollsBackVerification() public {
        vm.prank(A); escrow.submitEvidence(1, TERMS, EVIDENCE);
        vm.prank(F); escrow.confirmReceipt(1, EVIDENCE, 500);
        money.pause();
        vm.expectRevert(); vm.prank(V); escrow.verify(1, EVIDENCE, 500);
        require(!escrow.getMilestone(1).verified && !escrow.getMilestone(1).closed);
        require(money.balanceOf(A) == 0);
        money.unpause();
        vm.prank(V); escrow.verify(1, EVIDENCE, 500);
        require(escrow.getMilestone(1).closed && money.balanceOf(A) == 10000 ether);
    }
}
