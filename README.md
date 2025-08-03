<h1 align="center"><img src='https://i.imgur.com/Nar1fRE.png' height='100'><br>AokiR2</br></h1>
<p align="center">a cloudflare workers implementation for aoki's mappack bucket server.<br>focus on making free stuff actually useful.</br></p>

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=704992714109878312)
[![License](https://img.shields.io/github/license/ProjectMewo/AokiR2?style=for-the-badge)](https://github.com/ProjectMewo/AokiR2/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/ProjectMewo/AokiR2?style=for-the-badge)](https://github.com/ProjectMewo/AokiR2/stargazers)
[![Issues](https://img.shields.io/github/issues/ProjectMewo/AokiR2?style=for-the-badge)](https://github.com/ProjectMewo/AokiR2/issues)

</div>

---
## TL;DR

You don't want to waste time in this era.
- This uses Cloudflare Workers + R2 for Aoki mappack bucket.
- **Pro:** R2 is free if you store under 10GB.
- **Con:** R2 needs a card and a domain to set up.
- **Set up:** Fill `.env`, run `wrangler deploy`. Done.

## Information

Aoki has a Cloudflare R2 bucket for storing generated osu! tournament mappacks. I have an eternal hatred with doing everything by hand when I think something can be automated easily, so implementing it in Aoki has always been something I want to do.

Cloudflare R2. Why this? The first 10GB of things you store in there is **free, it costs nothing.** 10 gigabytes. It also wipes out things after a set amount of time that you can configure so you don't clog stuff up.

So initially I made stuff upload from a random VPS server, but then it proved to be quite stupid. Why don't I just use Cloudflare Workers? It's much simpler, it's more robust, it doesn't need to stay on for forever, and everything is in the Cloudflare ecosystem.

## What do I need to run this?

At this time R2 needs a card to set up, and I will predict that lures 75% of script kiddies out of here, which is good.

Saying it needs a card doesn't mean it *charges* you. It will charge you if you somehow go past the 10GB of free storage (and also R/W limits, but that is also very generous), but outside of that you can be rest assured your money should be quite safe in there.

A domain. Now this should lure the remaining 25% of script kiddies out of here, because that domain should be yours and added to Cloudflare itself. That'll cost you a few bucks.

The domain is for your CDN URL, else CCloudflare won’t let you expose your bucket publicly, which also stops your users from downloading anything off your bucket. Ignore the technical stuff about the CDN URL and whatever else.

A Worker base already configured. Do this on your Cloudflare dashboard, navigate to `Compute (Workers)` and do as instructed.

That should be it. Workers has very generous limits, you don't even need a card for it, so later if you plan to also make something that runs on this you don't have to worry much.

## So how do I run it?

Fill in the `.env.example` file, rename it to `.env`.

Get the Wrangler CLI. This is a one-liner:
```sh
npm i -g wrangler
```
Log into your Cloudflare account, then just deploy this off:
```sh
wrangler deploy
```
Done, it should be there waiting for the very first request of Aoki. Do note that you aren't going to use this outside of Aoki, because her codebase has pretty specific things that she sends to this worker.

Else, if you want this to work with your project too, send something like this:
```js
await fetch("https://the-r2-server.workers.dev", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.INTERNAL_KEY}`
  },
  body: JSON.stringify({ 
    maps: [{
      slot: "NM",
      url: "https://osu.ppy.sh/b/123456",
    }]
  })
}).then(async res => await res.json());
```

## Why *not* S3?

I'm more familiar with R2 and Cloudflare's way of things, and R2 is just S3 because it's compatible with S3. If you use Bun and you also use Bun's new `S3Client`, you can abolutely do that with R2.

```js
const s3 = new Bun.S3Client({
  bucket: "your-bucket",
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY!,
  secretAccessKey: process.env.R2_SECRET_KEY!
});
```

Other clients should also recognize R2 like this.

## Code License & Contribution
[GPL-3.0](/LICENSE).

This is a learning project pushed to production, use any code that makes sense to you, but don't fully copy the entire thing.

To contribute, simply make a fork of this repository, make your changes, then make a pull request. There is a template ready for a standard PR.

To work with the codebase, make sure:
- You stay sane and happy.