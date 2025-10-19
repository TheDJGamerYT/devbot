import os
import nextcord
from nextcord.ext import commands

token = os.getenv("DISCORD_TOKEN")
if not token:
    print("DISCORD_TOKEN missing. Put it in .env")
    raise SystemExit(1)

intents = nextcord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"[py:sample-bot] Logged in as {bot.user} (id={bot.user.id})")

@bot.command()
async def ping(ctx):
    await ctx.send("Pong!")

bot.run(token)
