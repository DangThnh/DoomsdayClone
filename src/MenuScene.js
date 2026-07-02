class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    init() {
        // Khởi tạo các giá trị mặc định trong localStorage nếu chưa có
        if (localStorage.getItem('zs_gold') === null) localStorage.setItem('zs_gold', '100'); // Cho sẵn 100 vàng trải nghiệm
        if (localStorage.getItem('zs_atk_level') === null) localStorage.setItem('zs_atk_level', '1');
        if (localStorage.getItem('zs_wall_level') === null) localStorage.setItem('zs_wall_level', '1');
        if (localStorage.getItem('zs_highscore') === null) localStorage.setItem('zs_highscore', '0');

        this.gold = parseInt(localStorage.getItem('zs_gold'));
        this.atkLevel = parseInt(localStorage.getItem('zs_atk_level'));
        this.wallLevel = parseInt(localStorage.getItem('zs_wall_level'));
        this.highScore = parseInt(localStorage.getItem('zs_highscore'));
    }

    create() {
        // Vẽ nền tối giản
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);

        // Tiêu đề game
        this.add.text(270, 150, "DOOMSDAY SHELTER", { font: 'bold 40px Arial', fill: '#e74c3c' }).setOrigin(0.5);
        this.add.text(270, 200, "ZOMBIE SHOOTER MVP", { font: 'bold 20px Arial', fill: '#f1c40f' }).setOrigin(0.5);

        // Hiển thị Vàng & Điểm cao
        this.goldText = this.add.text(270, 260, `🪙 VÀNG: ${this.gold}`, { font: 'bold 24px Arial', fill: '#ffd700' }).setOrigin(0.5);
        this.add.text(270, 300, `🏆 Kỷ lục: Wave ${this.highScore}`, { font: '18px Arial', fill: '#bbb' }).setOrigin(0.5);

        // ==========================================
        // KHU VỰC NÂNG CẤP CHỈ SỐ VĨNH VIỄN
        // ==========================================
        
        // Cấu hình giá tiền nâng cấp (Tăng dần theo cấp độ)
        this.getUpgradeCost = (level) => level * 50; 

        // 1. Nút Nâng cấp ATK Súng
        let atkCost = this.getUpgradeCost(this.atkLevel);
        this.atkPanel = this.add.rectangle(270, 420, 400, 80, 0x2c3e50).setInteractive({ useHandCursor: true });
        this.atkText = this.add.text(100, 420, `ST Súng (Lv.${this.atkLevel})\nST: ${15 + (this.atkLevel - 1) * 5}`, { font: '18px Arial', fill: '#fff' }).setOrigin(0, 0.5);
        this.atkCostText = this.add.text(440, 420, `🪙 ${atkCost}`, { font: 'bold 18px Arial', fill: '#ffd700' }).setOrigin(1, 0.5);

        this.atkPanel.on('pointerdown', () => this.buyUpgrade('atk'));

        // 2. Nút Nâng cấp Máu Tường Thành
        let wallCost = this.getUpgradeCost(this.wallLevel);
        this.wallPanel = this.add.rectangle(270, 520, 400, 80, 0x2c3e50).setInteractive({ useHandCursor: true });
        this.wallText = this.add.text(100, 520, `Máu Thành (Lv.${this.wallLevel})\nHP: ${100 + (this.wallLevel - 1) * 50}`, { font: '18px Arial', fill: '#fff' }).setOrigin(0, 0.5);
        this.wallCostText = this.add.text(440, 520, `🪙 ${wallCost}`, { font: 'bold 18px Arial', fill: '#ffd700' }).setOrigin(1, 0.5);

        this.wallPanel.on('pointerdown', () => this.buyUpgrade('wall'));

        // ==========================================
        // NÚT BẮT ĐẦU CHƠI
        // ==========================================
        let playBtn = this.add.rectangle(270, 700, 300, 70, 0x27ae60).setInteractive({ useHandCursor: true });
        this.add.text(270, 700, "XUẤT TRẬN", { font: 'bold 28px Arial', fill: '#fff' }).setOrigin(0.5);

        playBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }

    buyUpgrade(type) {
        if (type === 'atk') {
            let cost = this.getUpgradeCost(this.atkLevel);
            if (this.gold >= cost) {
                this.gold -= cost;
                this.atkLevel++;
                localStorage.setItem('zs_gold', this.gold.toString());
                localStorage.setItem('zs_atk_level', this.atkLevel.toString());
                this.cameras.main.flash(100, 46, 204, 113, 0.5);
            } else {
                this.cameras.main.shake(100, 0.005);
            }
        } else if (type === 'wall') {
            let cost = this.getUpgradeCost(this.wallLevel);
            if (this.gold >= cost) {
                this.gold -= cost;
                this.wallLevel++;
                localStorage.setItem('zs_gold', this.gold.toString());
                localStorage.setItem('zs_wall_level', this.wallLevel.toString());
                this.cameras.main.flash(100, 46, 204, 113, 0.5);
            } else {
                this.cameras.main.shake(100, 0.005);
            }
        }

        // Cập nhật lại giao diện
        this.goldText.setText(`🪙 VÀNG: ${this.gold}`);
        
        let nextAtkCost = this.getUpgradeCost(this.atkLevel);
        this.atkText.setText(`ST Súng (Lv.${this.atkLevel})\nST: ${15 + (this.atkLevel - 1) * 5}`);
        this.atkCostText.setText(`🪙 ${nextAtkCost}`);

        let nextWallCost = this.getUpgradeCost(this.wallLevel);
        this.wallText.setText(`Máu Thành (Lv.${this.wallLevel})\nHP: ${100 + (this.wallLevel - 1) * 50}`);
        this.wallCostText.setText(`🪙 ${nextWallCost}`);
    }
}