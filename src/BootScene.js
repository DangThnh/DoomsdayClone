class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        this.load.setPath('assets/images/');
        this.load.image('bg', 'bg.jpg');
        this.load.image('player', 'player.png');
        this.load.image('zombie', 'zombie.png');
        this.load.image('bullet', 'bullet.png');
    }
    create() { this.scene.start('GameScene'); }
}