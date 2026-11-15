# Bild-Prompt für das Banner/Wallpaper (Gemini)

**Seitenverhältnis 5:1, 2000 × 400 Pixel. Kein Text im Bild.** Der Titel "Volk" wird später vom Hub darübergesetzt; lass deshalb links etwa ein Drittel der Fläche ruhiger (Himmel, Meer, sanfte Hügel).

## Prompt (zum Kopieren)

> Wide panoramic pixel art landscape, 5:1 aspect ratio (2000x400), detailed 16-bit strategy game style with crisp pixels and a limited warm palette. A slightly elevated, three-quarter view over a world made of hexagonal tiles with visible tile edges and small cliff sides at the coast. In the center-right a medieval walled city with half-timbered houses, a stone castle tower and red pennants, smoke rising from chimneys; around it golden wheat fields, a winding blue river with a stone bridge, a dirt road and a windmill. On the right a calm sea with a coast, two sailing ships (a frigate with three masts and a small cog) and fishing boats. In the far background misty snow-capped mountains and a hint of a volcano with a thin plume of smoke; distant hills fade into soft haze and fog. On the left side a quieter area: rolling green hills, a pine forest edge, a few grazing deer and the soft morning sky with pixel clouds, leaving calm space for a title. Golden hour light from the left, long soft shadows, cozy and inviting mood, rich but not oversaturated colors, clean pixel outlines (dark brown), no anti-aliasing blur.

## Bitte NICHT im Bild
- **keine Schrift, keine Buchstaben, keine Zahlen, keine Logos, keine Wasserzeichen, keine Signatur**
- keine bekannten Figuren, Marken oder Spiele-Charaktere (nichts aus Civilization oder anderen Spielen nachbilden)
- keine realistischen Fotos, kein 3D-Render-Look, kein Weichzeichner-Glow
- keine Benutzeroberfläche (keine Knöpfe, Leisten, Rahmen, Mauszeiger)
- keine Gewaltszenen, kein Blut
- keine Menschen in Großaufnahme (Figuren höchstens winzig)

## Danach
Das erzeugte Bild mit `python3 tools/banner-zuschneiden.py <bild> hub-eintrag/volk-wallpaper.webp` auf 2000 × 400 WebP bringen (schneidet mittig auf 5:1 zu und skaliert).
