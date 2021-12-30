import { GuildMember } from 'discord.js';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db } from 'mongodb';
import constants from '../constants/constants';
import envUrls from '../constants/envUrls';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { CustomerCollection } from '../../types/bounty/CustomerCollection';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string, guildId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return seekHelpValidBountyId(guildMember, bountyId, guildId);
};

export const seekHelpValidBountyId = async (
	guildMember: GuildMember,
	bountyId: string,
	guildId: string
): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbBounties = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbCustomers = db.collection(constants.DB_COLLECTION_CUSTOMERS);

	const dbBountyResult: BountyCollection = await dbBounties.findOne({
		_id: new mongo.ObjectId(bountyId),
	});

	const dbCustomerResult: CustomerCollection = await dbCustomers.findOne({
		customerId: guildId
	});

	if (!dbCustomerResult) {
		LogUtils.logError(`Unable to pull customerId: ${guildId}`, new Error(), guildId);
	}

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);
	const bountyUrl = envUrls.BOUNTY_BOARD_URL + dbBountyResult._id;
	const createdByUser: GuildMember = await guildMember.guild.members.fetch(dbBountyResult.createdBy.discordId);
	const claimedByUser: GuildMember = await guildMember.guild.members.fetch(dbBountyResult.claimedBy.discordId);
	const sosUser: GuildMember = await guildMember.guild.members.fetch(process.env.DISCORD_BOUNTY_BOARD_SOS_ID);
	const customerName: string = dbCustomerResult.customerName;
	
	if (createdByUser.id === guildMember.id) {
		await sosUser.send({ content: `<@${guildMember.user.id}> from ${customerName} needs some help with bounty ${bountyUrl}. Please reach out to them to check.` });
	} else if (guildMember.id === claimedByUser.id) {
		await createdByUser.send({ content: `<@${guildMember.user.id}> from ${customerName} needs some help with bounty ${bountyUrl}. Please reach out to them to check.` });
	}
	Log.info(`message sent requesting help for bounty ${bountyId} submitted by ${guildMember.user.tag}`);
	return guildMember.send({ content: `SOS sent, look out for a follow up message for bounty ${bountyUrl}` });
};