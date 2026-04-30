import { clamp, weapons } from "./config.js";

export function createUi() {
  const ui = {
    healthText: document.getElementById("healthText"),
    healthFill: document.getElementById("healthFill"),
    ammoText: document.getElementById("ammoText"),
    reloadFill: document.getElementById("reloadFill"),
    roundText: document.getElementById("roundText"),
    messageText: document.getElementById("messageText"),
    pointsText: document.getElementById("pointsText"),
    zombieText: document.getElementById("zombieText"),
    shopHint: document.getElementById("shopHint"),
    menuOverlay: document.getElementById("menuOverlay"),
    shopOverlay: document.getElementById("shopOverlay"),
    gameOverOverlay: document.getElementById("gameOverOverlay"),
    gameOverStats: document.getElementById("gameOverStats"),
    startButton: document.getElementById("startButton"),
    restartButton: document.getElementById("restartButton"),
    closeShopButton: document.getElementById("closeShopButton"),
    weaponList: document.getElementById("weaponList"),
    damageVignette: document.getElementById("damageVignette"),
  };

  function renderShop(game) {
    ui.weaponList.innerHTML = "";
    weapons.forEach((weapon, index) => {
      const owned = game.state.owned.has(weapon.id);
      const current = game.state.weaponIndex === index;
      const row = document.createElement("article");
      row.className = `weapon-row${current ? " current" : ""}`;

      const info = document.createElement("div");
      const thumb = document.createElement("div");
      thumb.className = `weapon-thumb ${weapon.id}`;
      thumb.setAttribute("aria-hidden", "true");
      const title = document.createElement("h3");
      title.textContent = weapon.name;
      const profile = document.createElement("p");
      profile.textContent = `${weapon.profile}. Damage ${weapon.damage}, mag ${weapon.mag}, reserve ${weapon.reserve}, cost ${weapon.cost}.`;
      info.append(title, profile);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = current ? "Equipped" : owned ? "Equip" : `Buy ${weapon.cost}`;
      button.disabled = current || (!owned && game.state.points < weapon.cost);
      button.addEventListener("click", () => game.buyOrEquipWeapon(weapon.id));
      row.append(thumb, info, button);
      ui.weaponList.append(row);
    });
  }

  function updateHud(game) {
    const weapon = game.currentWeapon();
    ui.healthText.textContent = `Health ${Math.ceil(game.player.health)}`;
    ui.healthFill.style.width = `${clamp(game.player.health / game.player.maxHealth * 100, 0, 100)}%`;
    ui.pointsText.textContent = `Points ${game.state.points}`;
    ui.zombieText.textContent = `Zombies ${game.zombies.length}`;
    ui.roundText.textContent = `Round ${game.state.round}`;
    ui.messageText.textContent = game.state.message;

    const ammo = game.state.ammo[weapon.id];
    const reloadPct =
      game.state.reloading > 0 ? (weapon.reload - game.state.reloading) / weapon.reload : ammo.mag / weapon.mag;
    ui.ammoText.textContent =
      game.state.reloading > 0 ? `${weapon.name} reloading` : `${weapon.name} ${ammo.mag}/${ammo.reserve}`;
    ui.reloadFill.style.width = `${clamp(reloadPct * 100, 0, 100)}%`;
    ui.shopHint.classList.toggle("visible", game.state.mode === "playing" && game.nearShop);
  }

  return { ...ui, renderShop, updateHud };
}
