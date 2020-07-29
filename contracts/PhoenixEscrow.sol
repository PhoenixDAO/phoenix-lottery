pragma solidity ^0.5.4;

import './PhoenixTokenTestnetInterface.sol';

// Latest deployed working sample: 0x448Db81E994fF4F0e94c46cF573ea16734B78703

/// @notice Stores PHNX inside as an escrow for lotteries. This contracts stores the initial reward set by the lottery creator and the ticket funds that users pay to participate in the lottery, then it distributes rewards and the corresponding fee to the fee receiver.
/// @author Merunas Grincalaitis <merunasgrincalaitis@gmail.com>
contract PhoenixEscrow {
    uint256 public endTimestamp;
    address public phoenixLotteryAddress;
    uint256 public phoenixReward;
    uint256 public fee;
    address payable public feeReceiver;
    PhoenixTokenTestnetInterface public phoenixToken;

    modifier onlyPhoenixLottery() {
        require(msg.sender == phoenixLotteryAddress, 'This function can only be executed by the original PhoenixLottery');
        _;
    }

    // To set all the initial variables
    constructor(uint256 _endTimestamp, address _phoenixToken, uint256 _phoenixReward, uint256 _fee, address payable _feeReceiver) public {
        require(_endTimestamp > now, 'The lottery must end after now');
        require(_phoenixToken != address(0), 'You must set the token address');
        require(_phoenixReward > 0, 'The reward must be larger than zero PHNX tokens');
        require(_fee >= 0 && _fee <= 100, 'The fee must be between 0 and 100 (in percentage without the % symbol)');
        require(_feeReceiver != address(0), 'You must set a fee receiver');
        endTimestamp = _endTimestamp;
        phoenixLotteryAddress = msg.sender;
        phoenixToken = PhoenixTokenTestnetInterface(_phoenixToken);
        phoenixReward = _phoenixReward;
        fee = _fee;
        feeReceiver = _feeReceiver;
    }

    // To send the reward to the winner and distribute the corresponding fee to the fee receiver
    function releaseWinnerReward(address _winner) public onlyPhoenixLottery {
        require(now >= endTimestamp, 'You can only release funds after the lottery has ended');
        uint256 phoenixInsideThisContract = phoenixToken.balanceOf(address(this));
        uint256 phoenixForFeeReceiver;
        uint256 phoenixForWinner;

        // If there is no fee, the winner gets all including the ticket prices accomulated + the standard reward, if there's a fee, the winner gets his reward + the ticket prices accomulated - the fee percentage
        if(fee == 0) {
            phoenixForFeeReceiver = 0;
            phoenixForWinner = phoenixInsideThisContract;
        } else {
            phoenixForFeeReceiver = phoenixInsideThisContract * (fee / 100);
            phoenixForWinner = phoenixInsideThisContract - phoenixForFeeReceiver;
        }

        phoenixToken.transfer(_winner, phoenixForWinner);
        phoenixToken.transfer(feeReceiver, phoenixForFeeReceiver);
    }
}
