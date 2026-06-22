const config = {
    type: Phaser.AUTO,
    width: 540,
    height: 960,
    backgroundColor: '#2d3436', 
    parent: 'game-container',
    physics: {
        default: 'arcade', // DÙNG ARCADE PHYSICS
        arcade: {
            gravity: { y: 0 }, // Góc nhìn Top-down (Từ trên xuống) nên không có trọng lực rơi
            debug: false
        }
    },
    scene: [BootScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
const game = new Phaser.Game(config);