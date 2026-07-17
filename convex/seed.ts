import { mutation } from "./_generated/server";

export default mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Seed Campaign
    const existingCampaign = await ctx.db.query("campaigns").first();
    let campaignId = existingCampaign?._id;

    if (!campaignId) {
      campaignId = await ctx.db.insert("campaigns", {
        politicianName: "Hon. David Ochieng",
        office: "Governor",
        region: "Nairobi",
        agentInviteLink: "nairobi-decides-2027",
      });
    } else {
      await ctx.db.patch(campaignId, {
        politicianName: "Hon. David Ochieng",
      });
    }

    // 2. Seed Polling Stations
    const existingStations = await ctx.db.query("pollingStations").collect();
    if (existingStations.length === 0) {
      await ctx.db.insert("pollingStations", {
        code: "001",
        name: "Moi Primary School",
        region: "Nairobi",
        registeredVoters: 520,
      });
      await ctx.db.insert("pollingStations", {
        code: "042",
        name: "Mombasa High",
        region: "Mombasa",
        registeredVoters: 810,
      });
      await ctx.db.insert("pollingStations", {
        code: "103",
        name: "Kisumu Center",
        region: "Kisumu",
        registeredVoters: 340,
      });
    }

    return "Seeding complete!";
  },
});
