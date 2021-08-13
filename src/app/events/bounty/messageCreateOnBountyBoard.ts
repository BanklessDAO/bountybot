import { GuildMember, Message } from 'discord.js';
import constants from '../../service/constants/constants';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import envUrls from '../../service/constants/envUrls';
import { addPublishReactions } from '../../service/bounty/create/PublishBounty';
import { BountyCollection } from '../../types/bounty/BountyCollection';

export default async (message: Message): Promise<any> => {
	if (message.author.username !== constants.BOUNTY_BOARD_WEBSITE_WEBHOOK_NAME) return;
	
	// Add reactions to newly created message
	addPublishReactions(message);

	const bountyId: string = BountyUtils.getBountyIdFromEmbedMessage(message);
	
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	const guildMember: GuildMember = message.guild.member(dbBountyResult.createdBy.discordId);

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);
	
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			discordMessageId: message.id,
		},
	});

	if (writeResult.modifiedCount != 1) {
		console.log(`failed to update record ${bountyId} for user <@${guildMember.user.id}>`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry something is not working, our devs are looking into it.`);
	}

	await dbInstance.close();

	return guildMember.send(`<@${guildMember.user.id}> Bounty published to #🧀-bounty-board and the website! ${envUrls.BOUNTY_BOARD_URL}${bountyId}`);
};