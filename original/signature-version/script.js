document.addEventListener("DOMContentLoaded", () => {
    var canvas = document.getElementById("signature-pad");
    var ctx = canvas.getContext("2d");
    var isDrawing = false;
    var lastX = 0, lastY = 0;
    var strokeStyle = "pen";

    // 创建开始绘制的函数
    function startDrawing(e) {
        e.preventDefault(); // 阻止默认事件
        isDrawing = true;
        ctx.beginPath();

        const { offsetX, offsetY } = getEventPosition(e);
        [lastX, lastY] = [offsetX, offsetY];
        ctx.moveTo(offsetX, offsetY); // 画笔移动到绘制起点
    }
    // 创建绘制过程中的函数
    function draw(e) {
        e.preventDefault();
        if (!isDrawing) return;

        const { offsetX, offsetY } = getEventPosition(e);
        // 使用贝塞尔曲线进行平滑过渡绘制
        ctx.quadraticCurveTo(
            lastX,
            lastY,
            (lastX + offsetX) / 2,
            (lastY + offsetY) / 2
        )
        ctx.stroke(); // 实际绘制路径
        [lastX, lastY] = [offsetX, offsetY];
    }
    // 创建结束绘制的函数
    function endDrawing(e) {
        e.preventDefault();
        isDrawing = false;
    }

    function getEventPosition(e) {
        return {
            offsetX: e.offsetX || e.touches[0].clientX - canvas.offsetLeft,
            offsetY: e.offsetY || e.touches[0].clientY - canvas.offsetTop
        }
    }

    // 鼠标事件绑定
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDrawing);
    canvas.addEventListener("mouseout", endDrawing);

    // 触摸事件绑定
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", endDrawing);
    canvas.addEventListener("touchcancel", endDrawing);

    // 清除画布
    document.getElementById("clear").addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // 选择绘制工具
    document.getElementById("stroke-style").addEventListener("change", () => {
        strokeStyle = document.getElementById("stroke-style").value;
        updateStrokeStyle();
    });

    // 更新绘制工具样式
    function updateStrokeStyle() {
        ctx.lineWidth = strokeStyle === "pen" ? 2 : 5;
        ctx.lineCap = strokeStyle === "pen" ? "round" : "square";
    }

    // 保存签名
    document.getElementById("save").addEventListener("click", async () => {
        const image = canvas.toDataURL("image/png");
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            window.open(image, "_blank");
        } else {
            try {
                const blob = await (await fetch(image)).blob();
                const handle = await window.showSaveFilePicker({
                    suggestedName: "signature.png",
                    type: [{
                        description: "PNG image",
                        accept: { 'image/png': ['.png'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } catch (err) {
                console.error('保存文件失败:', err);
                alert('保存文件失败，请重试或检查浏览器设置。');
            }
        }
    });

    updateStrokeStyle();
});