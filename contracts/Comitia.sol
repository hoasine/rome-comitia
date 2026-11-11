// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Comitia
/// @notice Polls that EVM and Solana wallets vote in together on Rome.
/// @dev Solana votes are proven: Rome derives a Solana wallet's EVM caller as the last
///      20 bytes of keccak256(pubkey), so `voteAsSolana` checks that derivation on-chain.
contract Comitia {
    uint256 public constant MIN_OPTIONS = 2;
    uint256 public constant MAX_OPTIONS = 6;
    uint64 public constant MIN_DURATION = 1 hours;
    uint64 public constant MAX_DURATION = 30 days;
    uint256 public constant MAX_PAGE_SIZE = 25;

    struct Poll {
        address creator;
        string question;
        string description;
        string[] options;
        uint64 createdAt;
        uint64 endsAt;
        uint32 evmVoters;
        uint32 solanaVoters;
    }

    struct PollView {
        uint256 id;
        address creator;
        string question;
        string description;
        string[] options;
        uint32[] evmVotes;
        uint32[] solanaVotes;
        uint64 createdAt;
        uint64 endsAt;
        uint32 evmVoters;
        uint32 solanaVoters;
    }

    struct Ballot {
        bool cast;
        bool solana;
        uint8 option;
    }

    error AlreadyVoted();
    error EmptyValue();
    error InvalidDuration();
    error InvalidOption();
    error InvalidOptionCount();
    error LimitTooLarge();
    error NotSolanaSigner();
    error PollClosed();
    error PollNotFound();
    error TextTooLong();

    uint256 public pollCount;

    mapping(uint256 => Poll) private _polls;
    mapping(uint256 => mapping(uint256 => uint32)) private _evmVotes;
    mapping(uint256 => mapping(uint256 => uint32)) private _solanaVotes;
    mapping(uint256 => mapping(address => Ballot)) private _ballots;

    event PollCreated(uint256 indexed pollId, address indexed creator, uint64 endsAt);
    event Voted(
        uint256 indexed pollId,
        address indexed voter,
        uint8 option,
        bool solana,
        bytes32 solanaPubkey
    );

    function createPoll(
        string calldata question,
        string calldata description,
        string[] calldata options,
        uint64 durationSeconds
    ) external returns (uint256 pollId) {
        _requireText(question, 200);
        if (bytes(description).length > 500) revert TextTooLong();
        if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
            revert InvalidOptionCount();
        }
        for (uint256 index; index < options.length; index++) {
            _requireText(options[index], 64);
        }
        if (durationSeconds < MIN_DURATION || durationSeconds > MAX_DURATION) {
            revert InvalidDuration();
        }

        pollId = ++pollCount;
        Poll storage poll = _polls[pollId];
        poll.creator = msg.sender;
        poll.question = question;
        poll.description = description;
        poll.options = options;
        poll.createdAt = uint64(block.timestamp);
        poll.endsAt = uint64(block.timestamp) + durationSeconds;
        emit PollCreated(pollId, msg.sender, poll.endsAt);
    }

    function vote(uint256 pollId, uint8 option) external {
        _castVote(pollId, option, false, bytes32(0));
    }

    function voteAsSolana(uint256 pollId, uint8 option, bytes32 solanaPubkey) external {
        if (syntheticAddressOf(solanaPubkey) != msg.sender) revert NotSolanaSigner();
        _castVote(pollId, option, true, solanaPubkey);
    }

    function syntheticAddressOf(bytes32 solanaPubkey) public pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(solanaPubkey)))));
    }

    function getPoll(uint256 pollId) public view returns (PollView memory view_) {
        Poll storage poll = _getPoll(pollId);
        uint256 count = poll.options.length;
        uint32[] memory evmVotes = new uint32[](count);
        uint32[] memory solanaVotes = new uint32[](count);
        for (uint256 index; index < count; index++) {
            evmVotes[index] = _evmVotes[pollId][index];
            solanaVotes[index] = _solanaVotes[pollId][index];
        }
        view_ = PollView({
            id: pollId,
            creator: poll.creator,
            question: poll.question,
            description: poll.description,
            options: poll.options,
            evmVotes: evmVotes,
            solanaVotes: solanaVotes,
            createdAt: poll.createdAt,
            endsAt: poll.endsAt,
            evmVoters: poll.evmVoters,
            solanaVoters: poll.solanaVoters
        });
    }

    /// @notice Returns polls newest first.
    function getPolls(uint256 offset, uint256 limit) external view returns (PollView[] memory page) {
        if (limit > MAX_PAGE_SIZE) revert LimitTooLarge();
        if (offset >= pollCount || limit == 0) return new PollView[](0);
        uint256 size = pollCount - offset;
        if (size > limit) size = limit;
        page = new PollView[](size);
        for (uint256 index; index < size; index++) {
            page[index] = getPoll(pollCount - offset - index);
        }
    }

    function ballotOf(uint256 pollId, address voter) external view returns (Ballot memory) {
        _getPoll(pollId);
        return _ballots[pollId][voter];
    }

    function _castVote(uint256 pollId, uint8 option, bool solana, bytes32 solanaPubkey) private {
        Poll storage poll = _getPoll(pollId);
        if (block.timestamp >= poll.endsAt) revert PollClosed();
        if (option >= poll.options.length) revert InvalidOption();
        Ballot storage ballot = _ballots[pollId][msg.sender];
        if (ballot.cast) revert AlreadyVoted();

        ballot.cast = true;
        ballot.solana = solana;
        ballot.option = option;
        if (solana) {
            _solanaVotes[pollId][option]++;
            poll.solanaVoters++;
        } else {
            _evmVotes[pollId][option]++;
            poll.evmVoters++;
        }
        emit Voted(pollId, msg.sender, option, solana, solanaPubkey);
    }

    function _getPoll(uint256 pollId) private view returns (Poll storage poll) {
        poll = _polls[pollId];
        if (poll.creator == address(0)) revert PollNotFound();
    }

    function _requireText(string calldata value, uint256 maxBytes) private pure {
        if (bytes(value).length == 0) revert EmptyValue();
        if (bytes(value).length > maxBytes) revert TextTooLong();
    }
}
