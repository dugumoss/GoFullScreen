var isCapturing = false;

// 使用立即执行函数表达式 (IIFE) 来封装代码，避免全局变量污染
(async function() {
    let timeoutId;

    async function preloadImages() {
        const images = document.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = img.onerror = resolve;
                }
            });
        });
        await Promise.all(imagePromises);
    }

    async function captureFullPage() {
        if (isCapturing) {
            console.log('Capture already in progress, skipping');
            return;
        }
        console.log('begin capture');
        return performCapture();
    }

    async function performCapture() {
        isCapturing = true;
        console.log('captureFullPage function started');

        try {
            if (typeof html2canvas !== 'function') {
                console.error('html2canvas is not defined');
                throw new Error('html2canvas is not defined');
            } else {
                console.log('html2canvas is defined');
            }

            if (!document.body) {
                throw new Error('document.body is not available');
            }

            await preloadImages();
            console.log('Images preloaded');

            const fullHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );

            await new Promise(resolve => setTimeout(resolve, 500)); // 等待0.5秒
            console.log('Waiting for page to fully load');

            const canvas = await html2canvas(document.body, {
                allowTaint: true,
                useCORS: true,
                logging: true,
                scrollY: -window.scrollY,
                onclone: function(clonedDoc) {
                    console.log('Document cloned for capture');
                    clonedDoc.querySelectorAll('img').forEach(img => {
                        if (img.src.includes('img.lvv2.com')) {
                            img.remove();
                        }
                    });
                }
            });
            
            console.log('Canvas created');
            
            canvas.toBlob(function(blob) {
                const reader = new FileReader();
                reader.onloadend = function() {
                    const dataUrl = reader.result;
                    console.log('Data URL created:', dataUrl ? 'success' : 'failure');

                    // 取消超时
                    clearTimeout(timeoutId);

                    chrome.runtime.sendMessage({
                        action: 'captureResult', 
                        success: !!dataUrl,
                        dataUrl: dataUrl || null
                    });
                    console.log('Capture result sent');
                };
                reader.readAsDataURL(blob);
            });

            return true;
        } catch (error) {
            console.error('Error stack:', error.stack);
            chrome.runtime.sendMessage({action: 'captureResult', success: false, error: error.message, stack: error.stack});
            return false;
        } finally {
            isCapturing = false; // 确保状态被重置
        }
    }

    timeoutId = setTimeout(() => {
        if (isCapturing) {
            console.error('Capture timed out');
            chrome.runtime.sendMessage({action: 'captureResult', success: false, error: 'Capture timed out'});
            isCapturing = false; // 确保状态被重置
        }
    }, 20000); // 20秒超时

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'capture') {
            captureFullPage().then(() => {
                sendResponse({status: 'capture started'});
            });
        } else if (request.status === 'received') {
            // 在这里重置全局变量或执行其他清理操作
            isCapturing = false;
            console.log('Resetting state after receiving confirmation');
        }
        return true; // 这行代码确保 sendResponse 是异步的
    });
})();
