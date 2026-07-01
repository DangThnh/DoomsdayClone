class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        if (this.textures.exists('bg')) {
            this.add.image(270, 480, 'bg').setDisplaySize(540, 960).setDepth();
        }

        // =======================================================
        // 1. DỰNG TƯỜNG THÀNH VÀ NGƯỜI CHƠI (Bên dưới màn hình)
        // =======================================================
        
        // Vẽ bức tường phòng thủ
          this.wall = this.add.rectangle(270, 800, 540, 20, 0x95a5a6).setDepth(5000);
        this.physics.add.existing(this.wall, true); 

        // --- ĐÃ SỬA: BỎ setDisplaySize, DÙNG setScale ĐỂ TRÁNH LỖI ĐỔI ẢNH ---
        if (this.textures.exists('player_center')) {
            this.player = this.physics.add.sprite(270, 850, 'player_center').setScale(0.4).setDepth(5001); // Dùng Scale 1.0 hoặc tùy chỉnh
        } else {
            this.player = this.add.rectangle(270, 850, 80, 120, 0x3498db).setDepth(5001);
            this.physics.add.existing(this.player);
        }

        // =======================================================
        // 2. KHỞI TẠO OBJECT POOLS (HỒ CHỨA VẬT THỂ TÁI SỬ DỤNG)
        // =======================================================

        // A. HỒ CHỨA ĐẠN (Chứa tối đa 50 viên đạn cùng lúc để tránh lag)
        this.bulletPool = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 100,
            createCallback: function (bullet) {
                bullet.setName('bullet');
                bullet.setDepth(5);
                // Ép kích thước nếu chưa có ảnh
                if (!bullet.texture || bullet.texture.key === '__DEFAULT') {
                    bullet.setDisplaySize(20, 30);
                    bullet.setTint(0xf1c40f);
                } else {
                    bullet.setDisplaySize(20, 30);
                }
            }
        });

        // B. HỒ CHỨA QUÁI VẬT (Chứa tối đa 100 con quái)
        this.zombiePool = this.physics.add.group({
            defaultKey: 'zombie',
            maxSize: 100,
            createCallback: function (zombie) {
                zombie.setName('zombie');
                zombie.setDepth(6);
                if (!zombie.texture || zombie.texture.key === '__DEFAULT') {
                    zombie.setDisplaySize(90, 100);
                    zombie.setTint(0xe74c3c);
                } else {
                    zombie.setDisplaySize(90, 100);
                }
            }
        });

        // C. HỒ CHỨA HẠT KINH NGHIỆM (Chứa tối đa 200 hạt)
        this.expPool = this.physics.add.group({
            defaultKey: 'exp_gem',
            maxSize: 200,
            createCallback: function (gem) {
                gem.setName('exp_gem');
                gem.setDepth(4);
                if (!gem.texture || gem.texture.key === '__DEFAULT') {
                    gem.setDisplaySize(15, 15);
                    gem.setTint(0x2ecc71); // Màu xanh lá
                } else {
                    gem.setDisplaySize(15, 15);
                }
            }
        });

        // =======================================================
        // --- THÊM: HỆ THỐNG LEVEL VÀ THANH EXP (TRÊN CÙNG MÀN HÌNH) ---
        // =======================================================
        this.playerLevel = 1;
        this.currentExp = 0;
        this.maxExp = 100; // Mốc lên cấp 2

        this.expBg = this.add.rectangle(270, 20, 500, 15, 0x333333).setDepth(100);
        this.expFill = this.add.rectangle(20, 20, 0, 15, 0x3498db).setOrigin(0, 0.5).setDepth(101);
        this.levelText = this.add.text(270, 20, `LV. 1`, { font: 'bold 12px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(102);

        // Bật tính năng va chạm để hút EXP
        this.physics.add.overlap(this.player, this.expPool, (player, gem) => {
            this.collectExp(player, gem);
        });
        // =======================================================
        // 3. THIẾT LẬP VA CHẠM (COLLIDERS)
        // =======================================================
        
        // Đạn bắn trúng Quái vật
        this.physics.add.overlap(this.bulletPool, this.zombiePool, this.handleBulletHitZombie, null, this);
        
        // Quái vật cắn Tường thành
        this.physics.add.collider(this.zombiePool, this.wall, this.handleZombieHitWall, null, this);

        // =======================================================
        // BÀI TEST CHỨC NĂNG (TẠM THỜI ĐỂ KIỂM TRA POOL)
        // =======================================================
        this.input.on('pointerdown', (pointer) => {
            // Click để sinh đạn bay tới điểm click
            this.fireBullet(pointer.x, pointer.y);
        });

        // Tự động đẻ quái từ trên trời rơi xuống mỗi giây
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });

        // =======================================================
        // 4. THÔNG SỐ VŨ KHÍ & RADAR TỰ ĐỘNG BẮN
        // =======================================================
        this.fireRate = 600; // Tốc độ bắn mặc định: 0.5s / 1 viên
        this.lastFiredTime = 0; // Ghi nhớ thời điểm bắn cuối cùng

        // Radar quét mục tiêu độc lập (Tránh quét 60 lần/giây gây lag)
        this.currentTarget = null;
        this.manualTarget = null; 
        this.isManualFiring = false;
        this.time.addEvent({
            delay: 500, // Cứ 100ms (0.1s) Radar quét 1 lần tìm quái
            callback: this.findNearestZombie,
            callbackScope: this,
            loop: true
        });

         // =======================================================
        // --- THÊM MỚI: QUẢN LÝ BẮN THỦ CÔNG (MANUAL FIRE) ---
        // =======================================================
        this.isManualFiring = false; 
        this.manualTimeoutEvent = null; // Biến lưu trữ Timer để reset lại 0.5s

        // SỰ KIỆN NHẤN CHUỘT / CHẠM MÀN HÌNH (GHI ĐÈ LÊN SỰ KIỆN CŨ CỦA CẬU)
        this.input.on('pointerdown', (pointer) => {
            this.handleManualFire(pointer);
        });

        // HỖ TRỢ KÉO LƯỚT (Bấm giữ và quét ngón tay để xả đạn liên tục)
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) { // Chỉ bắn khi đang đè chuột/ngón tay
                this.handleManualFire(pointer);
            }
        });

    }

    // --- HÀM BẮN ĐẠN TÁI CHẾ (ĐÃ FIX OBJECT POOLING) ---
    fireBullet(targetX, targetY) {
        // Dùng get() bình thường để Phaser tự lo việc quản lý Pool
        let bullet = this.bulletPool.get(this.player.x, this.player.y);
        
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            
            let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
          
            bullet.rotation = angle + Math.PI/2;

            this.physics.moveTo(bullet, targetX, targetY, 800);
        }
    }

    // --- HÀM XỬ LÝ BẮN THỦ CÔNG ---
    handleManualFire(pointer) {
        this.isManualFiring = true;

        // Lưu lại tọa độ Click để hàm update() bắn, tuyệt đối KHÔNG gọi fireBullet ở đây!
        this.manualTarget = { x: pointer.x, y: pointer.y };

        if (this.manualTimeoutEvent) {
            this.manualTimeoutEvent.remove();
        }

        this.manualTimeoutEvent = this.time.delayedCall(500, () => {
            this.isManualFiring = false;
            this.manualTarget = null; // Xóa mục tiêu thủ công khi trả quyền cho AI
        });
    }

    // --- HÀM SINH QUÁI BẦY ĐÀN (ĐÃ FIX OBJECT POOLING) ---
    spawnZombie() {
        let spawnCount = 2; 

        for (let i = 0; i < spawnCount; i++) {
            let spawnX = Phaser.Math.Between(50, 490);
            let spawnY = Phaser.Math.Between(-100, -20); 

            // CÚ PHÁP CHUẨN CỦA OBJECT POOLING TRONG PHASER 3:
            // Dùng hàm get() mặc định. Nếu truyền thông số (x, y), nó sẽ tự động tái sử dụng quái chết.
            // Nếu hồ chứa (Pool) chưa đầy 100 con, nó sẽ tự đẻ thêm con mới.
            let zombie = this.zombiePool.get(spawnX, spawnY);

            if (zombie) {
                // Hồi sinh quái
                zombie.setActive(true);
                zombie.setVisible(true);
                
                // Máu cơ bản của quái
                zombie.hp = 10; 
                
                // Tốc độ quái bò xuống ngẫu nhiên
                let speed = Phaser.Math.Between(50, 80);
                this.physics.moveTo(zombie, spawnX, this.wall.y, speed);
            }
        }
    }

    // --- RADAR: TÌM CON QUÁI GẦN THÀNH NHẤT (CÓ Y LỚN NHẤT) ---
    findNearestZombie() {

         if (this.isManualFiring) {
            this.currentTarget = null;
            return;
        }
        
        let highestY = -999;
        let nearestZombie = null;

        // Quét tất cả quái vật ĐANG SỐNG trong Pool
        this.zombiePool.getChildren().forEach(zombie => {
            if (zombie.active && zombie.y > highestY) {
                highestY = zombie.y;
                nearestZombie = zombie;
            }
        });

        this.currentTarget = nearestZombie;
    }

    
   // --- SỰ KIỆN ĐẠN TRÚNG QUÁI CÓ TÍNH MÁU ---
    handleBulletHitZombie(bullet, zombie) {

         if (!zombie.active || !bullet.active) return;
        // Đạn nổ mất hình
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop(); 

        // Tạm thời đạn cùi có Damage = 10 (1 hit chết quái 10HP)
        let bulletDamage = 10; 
        zombie.hp -= bulletDamage;

        // Hiệu ứng giật lùi quái khi trúng đạn (Knockback nhẹ)
        zombie.y -= 5; 

        if (zombie.hp <= 0) {
            // LƯU LẠI TỌA ĐỘ TRƯỚC KHI QUÁI BIẾN MẤT
            let dropX = zombie.x;
            let dropY = zombie.y;

            zombie.setActive(false);
            zombie.setVisible(false);
            zombie.body.stop();
            zombie.setPosition(-999, -999);
            
            // --- THÊM: RỚT HẠT KINH NGHIỆM TẠI TỌA ĐỘ QUÁI CHẾT ---
            this.spawnExpGem(dropX, dropY);
        }
    }

    // --- SỰ KIỆN QUÁI CHẠM TƯỜNG ---
    handleZombieHitWall(zombie, wall) {
        // Quái vật sẽ bị kẹt lại trước tường (do Arcade Collider)
        // Lát nữa ở Giai đoạn 4, ta sẽ trừ máu tường ở đây!
    }

  update(time, delta) {
           // --- QUẢN LÝ DỌN RÁC (THU HỒI ĐẠN BAY RA KHỎI MÀN HÌNH AN TOÀN) ---
        this.bulletPool.getChildren().forEach(bullet => {
            if (bullet.active && (bullet.y < -50 || bullet.x < -50 || bullet.x > 590 || bullet.y > 1000)) {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.stop();
                // FIX LỖI TÀNG HÌNH: Ép đạn văng ra tít góc vũ trụ để quái không quẹt trúng!
                bullet.setPosition(-999, -999); 
            }
        });
        // =======================================================
        // --- THÊM MỚI: Y-SORTING (PHÂN LỚP ĐỒ HỌA CHIỀU SÂU) ---
        // Sắp xếp lại Depth của toàn bộ Quái vật đang sống dựa vào tọa độ Y.
        // Con nào đi xuống sâu hơn (Y lớn hơn) sẽ đè lên con ở trên (Y nhỏ hơn).
        // =======================================================
        this.zombiePool.setDepth(6); // Set độ sâu gốc của cả Pool
        this.children.depthSort();   // Lệnh tự động xếp lớp các children theo Y mặc định của Phaser (Nếu cấu hình Group cho phép)
        
        // CÁCH CHUẨN XÁC 100% CHO ARCADE GROUP:
        this.zombiePool.getChildren().forEach(zombie => {
            if (zombie.active) {
                // Tọa độ Y của zombie chạy từ 0 -> 800. 
                // Cộng thêm 100 để đảm bảo nó luôn nằm đè lên background (0) nhưng nằm dưới Tường (1000)
                zombie.setDepth(100 + Math.floor(zombie.y)); 
            }
        });
        // =======================================================

      // --- TỔNG TƯ LỆNH SÚNG (ĐỔI ẢNH + XOAY ĐỘNG) ---
        let targetX = null;
        let targetY = null;

        if (this.isManualFiring && this.manualTarget) {
            targetX = this.manualTarget.x;
            targetY = this.manualTarget.y;
        } else if (this.currentTarget && this.currentTarget.active) {
            targetX = this.currentTarget.x;
            targetY = this.currentTarget.y;
        }

        if (targetX !== null && targetY !== null) {
            // 1. Tính toán góc thực tế đến mục tiêu (Radian và Độ)
            let angleRad = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
            let angleDeg = Phaser.Math.RadToDeg(angleRad);

            // Chặn góc bắn lùi (Cấm súng chĩa xuống đất)
            if (angleDeg > 0) return; 

            // 2. KHỞI TẠO BIẾN ĐỔI ẢNH VÀ BÙ TRỪ GÓC XOAY (OFFSET)
            let weaponKey = 'player_center';
            let rotationOffset = Math.PI / 2; // Mặc định là +90 độ (Chĩa thẳng)

            // Góc Trái (từ -180 đến -135)
            if (angleDeg >= -180 && angleDeg < -125) {
                weaponKey = 'player_left';
                // Bù trừ 135 độ (Giả định ảnh gốc player_left đã vẽ nghiêng sẵn sang trái 45 độ)
                rotationOffset = (Math.PI / 1.44); 
            } 
            // Góc Giữa (từ -135 đến -45)
            else if (angleDeg >= -125 && angleDeg <= -55) {
                weaponKey = 'player_center';
                // Bù trừ 90 độ (Giả định ảnh gốc player_center vẽ chĩa thẳng)
                rotationOffset = Math.PI / 2; 
            } 
            // Góc Phải (từ -45 đến 0)
            else if (angleDeg > -55 && angleDeg <= 0) {
                weaponKey = 'player_right';
                // Bù trừ 45 độ (Giả định ảnh gốc player_right đã vẽ nghiêng sẵn sang phải 45 độ)
                rotationOffset = Math.PI / 3.27; 
            }

            // 3. THAY ĐỔI ẢNH (CHỈ KHI CẦN THIẾT ĐỂ TRÁNH GIẬT HÌNH)
            if (this.textures.exists(weaponKey) && this.player.texture.key !== weaponKey) {
                this.player.setTexture(weaponKey);
            }

            // 4. XOAY SÚNG ĐỂ KHỚP 100% VỚI ĐƯỜNG ĐẠN BAY
            this.player.rotation = angleRad + rotationOffset;

            // 5. NHẢ ĐẠN
            if (time > this.lastFiredTime) {
                this.fireBullet(targetX, targetY);
                this.lastFiredTime = time + this.fireRate; 
            }
        }
    }   

    // =======================================================
    // HỆ THỐNG RỚT VÀ HÚT KINH NGHIỆM
    // =======================================================
  spawnExpGem(x, y) {
        // Lấy hạt Exp từ Pool
        let gem = this.expPool.get(x, y);
        if (gem) {
            gem.setActive(true);
            gem.setVisible(true);
            
            // --- ĐÃ FIX: Đảm bảo hạt Exp đứng yên ngay lúc mới sinh ra ---
            gem.body.setVelocity(0, 0); 
            gem.body.stop();

            // Hiệu ứng nảy nhẹ
            this.tweens.add({ targets: gem, y: y - 20, yoyo: true, duration: 200, ease: 'Quad.easeOut' });

            // Nửa giây sau mới bắt đầu hút về người chơi
            this.time.delayedCall(500, () => {
                if (gem.active) {
                    this.physics.moveToObject(gem, this.player, 400); 
                }
            });
        }
    }

   collectExp(player, gem) {
        // --- ĐÃ FIX: Cờ bảo vệ chống ăn 2 lần trong 1 frame ---
        if (!gem.active) return;

        // Tắt hạt exp, DỪNG VẬN TỐC, và tống nó ra khỏi màn hình!
        gem.setActive(false);
        gem.setVisible(false);
        gem.body.setVelocity(0, 0); // Xóa sạch lực hút
        gem.body.stop();
        gem.setPosition(-999, -999); // Tống ra vũ trụ

        // CỘNG EXP VÀ CẬP NHẬT THANH BAR
        this.currentExp += 20; 
        
        let ratio = Math.min(1, this.currentExp / this.maxExp);
        this.tweens.add({ targets: this.expFill, width: 500 * ratio, duration: 100 });

        // KIỂM TRA LÊN CẤP
        if (this.currentExp >= this.maxExp) {
            this.triggerLevelUp();
        }
    }

    // =======================================================
    // DỪNG TRÒ CHƠI VÀ MỞ BẢNG CHỌN KỸ NĂNG (ROGUELIKE)
    // =======================================================
    triggerLevelUp() {
        // 1. Tăng Level và Cài đặt lại Exp cho cấp tiếp theo (Công thức khó dần)
        this.playerLevel++;
        this.currentExp -= this.maxExp;
        this.maxExp = Math.floor(this.maxExp * 1.5); 
        this.levelText.setText(`LV. ${this.playerLevel}`);
        
        let ratio = Math.min(1, this.currentExp / this.maxExp);
        this.expFill.width = 500 * ratio;   

        // 2. PAUSE TOÀN BỘ CÁC BỘ ĐẾM THỜI GIAN VÀ VẬT LÝ
        this.physics.pause();
        this.time.paused = true; // Dừng luôn việc sinh quái và bắn súng

        // 3. VẼ POPUP CHỌN KỸ NĂNG NỔI LÊN TRÊN (Sẽ làm ở Bước 4)
        this.showSkillSelectionPopup();
    }

    // --- HÃY DÁN HÀM NÀY VÀO TRƯỚC DẤU ĐÓNG CLASS ---
    showSkillSelectionPopup() {
        let bgMask = this.add.rectangle(270, 480, 540, 960, 0x000000, 0.8).setDepth(2000).setInteractive();
        let title = this.add.text(270, 200, "LÊN CẤP! CHỌN KỸ NĂNG", { font: 'bold 36px Arial', fill: '#f1c40f', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(2001);

        const ALL_SKILLS = [
            { id: 'rapid_fire', name: "TỐC BẮN", desc: "Giảm thời gian hồi đạn 20%", color: 0x3498db },
            { id: 'explosive', name: "ĐẠN NỔ", desc: "Đạn gây nổ lan (Sắp ra mắt)", color: 0xe74c3c },
            { id: 'pierce', name: "XUYÊN THẤU", desc: "Đạn xuyên qua 1 mục tiêu (Sắp ra mắt)", color: 0x9b59b6 }
        ];

        let choices = ALL_SKILLS.slice(0, 3);
        let buttons = [];

        choices.forEach((skill, index) => {
            let py = 350 + (index * 150);

            let card = this.add.rectangle(270, py, 400, 100, skill.color).setStrokeStyle(4, 0xffffff).setInteractive({ useHandCursor: true }).setDepth(2001);
            let sName = this.add.text(100, py - 15, skill.name, { font: 'bold 24px Arial', fill: '#fff' }).setDepth(2002);
            let sDesc = this.add.text(100, py + 20, skill.desc, { font: '16px Arial', fill: '#ddd' }).setDepth(2002);
            
            buttons.push(card, sName, sDesc);

            card.on('pointerdown', () => {
                if (skill.id === 'rapid_fire') {
                    this.fireRate = Math.max(100, this.fireRate - 100); 
                    console.log("Đã học Tốc Bắn! Tốc độ hiện tại: " + this.fireRate);
                }

                bgMask.destroy();
                title.destroy();
                buttons.forEach(b => b.destroy());

                this.physics.resume();
                this.time.paused = false;
            });
        });
    }

}