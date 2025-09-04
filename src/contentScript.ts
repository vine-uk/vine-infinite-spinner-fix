const script = document.createElement("script");
script.src = chrome.runtime.getURL("fix.js");
script.onload = () => {
  script.remove();
};

(document.head || document.documentElement).appendChild(script);

window.addEventListener("variationsFixed", (e: Event) => {
  const headerElement = document.querySelector("#a-popover-3 .a-popover-header");

  if (headerElement) {
    const spinnerContainer = document.createElement("div");
    spinnerContainer.classList.add("vine-text-spinner");
    
    const textElement = document.createElement("div");
    textElement.classList.add("spinner-text");
    textElement.innerHTML = '<div class="morph-element left"><div class="spinner-circle"></div></div><span>INFINITE</span> <span class="spinning-word"><span class="vine-accent">SPINNER</span></span> <span>FIXED</span><div class="morph-element right"><div class="spinner-circle"></div></div>';
    
    spinnerContainer.appendChild(textElement);
    headerElement.appendChild(spinnerContainer);
    
    let isClosedHandled = false;
    let observer: MutationObserver | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
      if (isClosedHandled) return;
      isClosedHandled = true;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (spinnerContainer.parentElement) {
        spinnerContainer.remove();
      }
      
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
    
    timeoutId = setTimeout(() => {
      const modalElement = document.getElementById("a-popover-3");
      if (!modalElement || modalElement.style.display === "none" || modalElement.style.visibility === "hidden") {
        cleanup();
      } else {
        timeoutId = setTimeout(() => {
          cleanup();
        }, 300000);
      }
    }, 300000);
    
    try {
      observer = new MutationObserver((mutationsList, obs) => {
        if (isClosedHandled) return;

        for (const mutation of mutationsList) {
          if (mutation.type === "attributes" && mutation.attributeName === "style") {
            const target = mutation.target as HTMLElement;
            if ((target.style.display === "none" || target.style.visibility === "hidden")) {
              cleanup();
              break;
            }
          }
        }
      });

      const modalElement = document.getElementById("a-popover-3");
      if (modalElement) {
        observer.observe(modalElement, {
          attributes: true,
          attributeFilter: ["style"],
        });
        
        const handleUnload = () => {
          cleanup();
          window.removeEventListener("beforeunload", handleUnload);
          window.removeEventListener("unload", handleUnload);
        };
        
        window.addEventListener("beforeunload", handleUnload);
        window.addEventListener("unload", handleUnload);
      } else {
        cleanup();
      }
    } catch (error) {
      cleanup();
    }
  }
});