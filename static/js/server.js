// import express from 'express';
// import OpenAI from 'openai';
// import fetch from 'node-fetch';
// import dotenv from 'dotenv';
// dotenv.config();

// const app = express();
// app.use(express.json());
// app.use(express.static('public')); // chứa index.html

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const SPOTIFY_TOKEN = process.env.SPOTIFY_TOKEN; // token Spotify hợp lệ

// // --- Route OpenAI: phân loại thể loại ---
// app.post('/getGenres', async (req, res) => {
//   try {
//     const { userInput } = req.body;

//     const prompt = `
// Dựa trên sở thích người dùng dưới đây, hãy gợi ý 1-2 thể loại nhạc phù hợp:
// "${userInput}"

// **Chỉ trả về JSON thuần túy**, KHÔNG thêm bất kỳ giải thích nào.
// Định dạng: { "genres": ["Pop", "Acoustic"] }
//     `;

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4.1-mini',
//       messages: [{ role: 'user', content: prompt }]
//     });

//     const text = response.choices[0].message.content;
//     res.send(text); // gửi raw text cho frontend parse an toàn
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Lỗi khi gọi OpenAI API");
//   }
// });

// // --- Route Spotify: lấy playlist ---
// app.post('/getSpotifyPlaylists', async (req, res) => {
//   try {
//     const { genres } = req.body;
//     const genreQuery = genres.join(',');

//     const spotifyRes = await fetch(`https://api.spotify.com/v1/recommendations?limit=5&seed_genres=${genreQuery}`, {
//       headers: { 'Authorization': `Bearer ${SPOTIFY_TOKEN}` }
//     });

//     if (!spotifyRes.ok) {
//       const text = await spotifyRes.text();
//       throw new Error("Spotify API error: " + text);
//     }

//     const data = await spotifyRes.json();

//     // Chỉ gửi name + link
//     const playlists = data.tracks.map(t => ({
//       name: t.name,
//       url: t.external_urls.spotify
//     }));

//     res.json(playlists);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Lỗi khi gọi Spotify API");
//   }
// });

// app.listen(3000, () => console.log("Server running on http://localhost:3000"));
