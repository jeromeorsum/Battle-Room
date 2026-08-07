export async function generateBattleCardImage({ nameA, nameB, dateStr, timeStr, agencyName }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, '#0a0a0f');
  gradient.addColorStop(1, '#131319');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1080);

  // Accent glows
  ctx.fillStyle = 'rgba(37,244,238,0.12)';
  ctx.beginPath(); ctx.arc(150, 150, 300, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(254,44,85,0.12)';
  ctx.beginPath(); ctx.arc(930, 930, 300, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = '#ffd447';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('TIKTOK LIVE BATTLE', 540, 160);

  // Names
  ctx.fillStyle = '#25f4ee';
  ctx.font = 'bold 90px sans-serif';
  ctx.fillText(nameA, 540, 420);

  ctx.fillStyle = '#f2f2f5';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('VS', 540, 540);

  ctx.fillStyle = '#fe2c55';
  ctx.font = 'bold 90px sans-serif';
  ctx.fillText(nameB, 540, 660);

  // Date/time
  ctx.fillStyle = '#8d8d9a';
  ctx.font = '40px sans-serif';
  ctx.fillText(`${dateStr} · ${timeStr}`, 540, 800);

  if (agencyName) {
    ctx.fillStyle = '#8d8d9a';
    ctx.font = '28px sans-serif';
    ctx.fillText(agencyName, 540, 980);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function shareOrDownloadBattleCard(params) {
  const blob = await generateBattleCardImage(params);
  const file = new File([blob], 'battle.png', { type: 'image/png' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'TikTok LIVE Battle' });
      return;
    } catch (e) {
      // user cancelled the share sheet or it failed — fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'battle.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
