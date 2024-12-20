class PopoverInfo {
    public mutationObserver: MutationObserver;
    public resizeObserver: ResizeObserver;
    public contentNodeObserver: ResizeObserver;
}

class PopoverPosition {
    public top: number;
    public left: number;
    public offsetX: number;
    public offsetY: number;
}

class Popover {
    private static flipClassReplacements = {
        "top": {
            "popover-top-left": "popover-bottom-left",
            "popover-top-center": "popover-bottom-center",
            "popover-anchor-bottom-center": "popover-anchor-top-center",
            "popover-top-right": "popover-bottom-right",
        },
        "left": {
            "popover-top-left": "popover-top-right",
            "popover-center-left": "popover-center-right",
            "popover-anchor-center-right": "popover-anchor-center-left",
            "popover-bottom-left": "popover-bottom-right",
        },
        "right": {
            "popover-top-right": "popover-top-left",
            "popover-center-right": "popover-center-left",
            "popover-anchor-center-left": "popover-anchor-center-right",
            "popover-bottom-right": "popover-bottom-left",
        },
        "bottom": {
            "popover-bottom-left": "popover-top-left",
            "popover-bottom-center": "popover-top-center",
            "popover-anchor-top-center": "popover-anchor-bottom-center",
            "popover-bottom-right": "popover-top-right",
        },
        "top-and-left": {
            "popover-top-left": "popover-bottom-right",
        },
        "top-and-right": {
            "popover-top-right": "popover-bottom-left",
        },
        "bottom-and-left": {
            "popover-bottom-left": "popover-top-right",
        },
        "bottom-and-right": {
            "popover-bottom-right": "popover-top-left",
        },
    };

    private static flipMargin = 0;

    private static map: { [key: string]: PopoverInfo } = {};
    private static contentObserver: ResizeObserver = null;
    private static mainContainerClass: string = null;

    // constructor
    static {
        window.addEventListener("scroll", () => {
            Popover.placePopoverByClassSelector("popover-fixed");
            Popover.placePopoverByClassSelector("popover-overflow-flip-always");
        });

        window.addEventListener("resize", () => {
            Popover.placePopoverByClassSelector();
        });
    }

    public static callback(id: string, mutationsList: MutationRecord[], observer: MutationObserver) {
        for (const mutation of mutationsList) {
            if (mutation.type === "attributes") {
                const target = mutation.target as HTMLElement;
                if (mutation.attributeName == "class") {
                    if (target.classList.contains("popover-overflow-flip-onopen") && target.classList.contains("popover-open") == false) {
                        (target as any).popoverFliped = null;
                        target.removeAttribute("data-popover-flip");
                    }

                    Popover.placePopoverByNode(target);
                }
                else if (mutation.attributeName == "data-ticks") {
                    const parent: HTMLElement = target.parentElement;
                    const tickValues: number[] = [];
                    let max = -1;
                    for (let i = 0; i < parent.children.length; i++) {
                        const childNode: Element = parent.children[i];
                        const tickValue: number = parseInt(childNode.getAttribute("data-ticks"));

                        if (tickValue == 0) {
                            continue;
                        }

                        if (tickValues.indexOf(tickValue) >= 0) {
                            continue;
                        }

                        tickValues.push(tickValue);

                        if (tickValue > max) {
                            max = tickValue;
                        }
                    }

                    if (tickValues.length == 0) {
                        continue;
                    }

                    const sortedTickValues: number[] = tickValues.sort((x, y) => x - y);

                    for (let i = 0; i < parent.children.length; i++) {
                        const childNode: HTMLElement = parent.children[i] as HTMLElement;
                        const tickValue: number = parseInt(childNode.getAttribute("data-ticks"));

                        if (tickValue == 0) {
                            continue;
                        }

                        if ((childNode as any).skipZIndex == true) {
                            continue;
                        }

                        childNode.style["z-index"] = "calc(var(--popover-zindex) + " + (sortedTickValues.indexOf(tickValue) + 3).toString() + ")";
                    }
                }
            }
        }
    }

    public static initialize(containerClass: string, flipMargin?: number): void {
        const mainContent: HTMLCollectionOf<Element> = document.getElementsByClassName(containerClass);
        if (mainContent.length == 0) {
            return;
        }

        if (flipMargin) {
            Popover.flipMargin = flipMargin;
        }

        Popover.mainContainerClass = containerClass;
        const mainContentFirstItem = mainContent[0] as any;

        if (!mainContentFirstItem.PopoverMark) {
            mainContentFirstItem.PopoverMark = "popovered";
            if (Popover.contentObserver != null) {
                Popover.contentObserver.disconnect();
                Popover.contentObserver = null;
            }

            Popover.contentObserver = new ResizeObserver(entries => {
                Popover.placePopoverByClassSelector();
            });

            Popover.contentObserver.observe(mainContent[0]);
        }
    }

    public static connect(id: string): void {
        Popover.initialize(Popover.mainContainerClass);

        const popoverNode: HTMLElement = document.getElementById("popover-" + id);
        const popoverContentNode: HTMLElement = document.getElementById("popovercontent-" + id);

        if (popoverNode && popoverNode.parentNode && popoverContentNode) {
            Popover.placePopover(popoverNode);

            const config = { attributeFilter: ["class", "data-ticks"] };
            const mutationObserver = new MutationObserver(this.callback.bind(this, id));

            mutationObserver.observe(popoverContentNode, config);

            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const target: Element = entry.target;

                    for (let i = 0; i < target.childNodes.length; i++) {
                        const childNode = target.childNodes[i] as any;
                        if (childNode.id && childNode.id.startsWith("popover-")) {
                            Popover.placePopover(childNode as HTMLElement);
                        }
                    }
                }
            });

            resizeObserver.observe(popoverNode.parentNode as Element);

            const contentNodeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const target: Element = entry.target;
                    Popover.placePopoverByNode(target);
                }
            });

            contentNodeObserver.observe(popoverContentNode);

            const popoverInfo = new PopoverInfo();
            popoverInfo.mutationObserver = mutationObserver;
            popoverInfo.resizeObserver = resizeObserver;
            popoverInfo.contentNodeObserver = contentNodeObserver;
            Popover.map[id] = popoverInfo;
        }
    }

    public static disconnect(id: string): void {
        if (Popover.map[id]) {
            const popoverInfo: PopoverInfo = Popover.map[id];
            popoverInfo.mutationObserver.disconnect();
            popoverInfo.resizeObserver.disconnect();
            popoverInfo.contentNodeObserver.disconnect();

            delete Popover.map[id];
        }
    }

    public static dispose(): void {
        for (const i in Popover.map) {
            Popover.disconnect(i);
        }

        if (Popover.contentObserver != null) {
            Popover.contentObserver.disconnect();
            Popover.contentObserver = null;
        }
    }

    public static getAllObservedContainers(): string[] {
        const result: string[] = [];
        for (const i in this.map) {
            result.push(i);
        }

        return result;
    }

    private static calculatePopoverPosition(classList: string[], boundingRect: DOMRect, selfRect: DOMRect): PopoverPosition {
        let top = 0;
        let left = 0;

        if (classList.indexOf("popover-anchor-top-left") >= 0) {
            left = boundingRect.left;
            top = boundingRect.top;
        } else if (classList.indexOf("popover-anchor-top-center") >= 0) {
            left = boundingRect.left + boundingRect.width / 2;
            top = boundingRect.top;
        } else if (classList.indexOf("popover-anchor-top-right") >= 0) {
            left = boundingRect.left + boundingRect.width;
            top = boundingRect.top;
        } else if (classList.indexOf("popover-anchor-center-left") >= 0) {
            left = boundingRect.left;
            top = boundingRect.top + boundingRect.height / 2;
        } else if (classList.indexOf("popover-anchor-center-center") >= 0) {
            left = boundingRect.left + boundingRect.width / 2;
            top = boundingRect.top + boundingRect.height / 2;
        } else if (classList.indexOf("popover-anchor-center-right") >= 0) {
            left = boundingRect.left + boundingRect.width;
            top = boundingRect.top + boundingRect.height / 2;
        } else if (classList.indexOf("popover-anchor-bottom-left") >= 0) {
            left = boundingRect.left;
            top = boundingRect.top + boundingRect.height;
        } else if (classList.indexOf("popover-anchor-bottom-center") >= 0) {
            left = boundingRect.left + boundingRect.width / 2;
            top = boundingRect.top + boundingRect.height;
        } else if (classList.indexOf("popover-anchor-bottom-right") >= 0) {
            left = boundingRect.left + boundingRect.width;
            top = boundingRect.top + boundingRect.height;
        }

        let offsetX = 0;
        let offsetY = 0;

        if (classList.indexOf("popover-top-left") >= 0) {
            offsetX = 0;
            offsetY = 0;
        } else if (classList.indexOf("popover-top-center") >= 0) {
            offsetX = -selfRect.width / 2;
            offsetY = 0;
        } else if (classList.indexOf("popover-top-right") >= 0) {
            offsetX = -selfRect.width;
            offsetY = 0;
        }
        else if (classList.indexOf("popover-center-left") >= 0) {
            offsetX = 0;
            offsetY = -selfRect.height / 2;
        } else if (classList.indexOf("popover-center-center") >= 0) {
            offsetX = -selfRect.width / 2;
            offsetY = -selfRect.height / 2;
        } else if (classList.indexOf("popover-center-right") >= 0) {
            offsetX = -selfRect.width;
            offsetY = -selfRect.height / 2;
        }
        else if (classList.indexOf("popover-bottom-left") >= 0) {
            offsetX = 0;
            offsetY = -selfRect.height;
        } else if (classList.indexOf("popover-bottom-center") >= 0) {
            offsetX = -selfRect.width / 2;
            offsetY = -selfRect.height;
        } else if (classList.indexOf("popover-bottom-right") >= 0) {
            offsetX = -selfRect.width;
            offsetY = -selfRect.height;
        }

        const result = new PopoverPosition();
        result.top = top;
        result.left = left;
        result.offsetX = offsetX;
        result.offsetY = offsetY;
        return result;
    }

    private static getPositionForFlippedPopver(inputClassListArray: string[], selector: string, boundingRect: DOMRect, selfRect: DOMRect): PopoverPosition {
        const classList: string[] = [];
        for (let i = 0; i < inputClassListArray.length; i++) {
            const item = inputClassListArray[i];
            const replacments: string = Popover.flipClassReplacements[selector][item];
            if (replacments) {
                classList.push(replacments);
            }
            else {
                classList.push(item);
            }
        }

        return Popover.calculatePopoverPosition(classList, boundingRect, selfRect);
    }

    private static placePopover(popoverNode: HTMLElement, classSelector?: string): void {
        if (popoverNode && popoverNode.parentNode) {
            const id: string = popoverNode.id.substring(8);
            const popoverContentNode: HTMLElement = document.getElementById("popovercontent-" + id);

            if (!popoverContentNode) {
                return;
            }

            if (popoverContentNode.classList.contains("popover-open") == false) {
                return;
            }

            if (classSelector) {
                if (popoverContentNode.classList.contains(classSelector) == false) {
                    return;
                }
            }

            const boundingRect: DOMRect = (popoverNode.parentNode as Element).getBoundingClientRect();

            if (popoverContentNode.classList.contains("popover-relative-width")) {
                popoverContentNode.style["max-width"] = (boundingRect.width) + "px";
            }

            const selfRect: DOMRect = popoverContentNode.getBoundingClientRect();
            const classList: DOMTokenList = popoverContentNode.classList;
            const classListArray: string[] = Array.from(popoverContentNode.classList);

            const position: PopoverPosition = Popover.calculatePopoverPosition(classListArray, boundingRect, selfRect);
            let left: number = position.left;
            let top: number = position.top;
            let offsetX: number = position.offsetX;
            let offsetY: number = position.offsetY;

            if (classList.contains("popover-overflow-flip-onopen") || classList.contains("popover-overflow-flip-always")) {
                const graceMargin: number = Popover.flipMargin;
                const deltaToLeft: number = left + offsetX;
                const deltaToRight: number = window.innerWidth - left - selfRect.width;
                const deltaTop: number = top - selfRect.height;
                const spaceToTop: number = top;
                const deltaBottom: number = window.innerHeight - top - selfRect.height;

                const popoverContentNodeAny = popoverContentNode as any;
                let selector: string = popoverContentNodeAny.popoverFliped;

                if (!selector) {
                    if (classList.contains("popover-top-left")) {
                        if (deltaBottom < graceMargin && deltaToRight < graceMargin && spaceToTop >= selfRect.height && deltaToLeft >= selfRect.width) {
                            selector = "top-and-left";
                        } else if (deltaBottom < graceMargin && spaceToTop >= selfRect.height) {
                            selector = "top";
                        } else if (deltaToRight < graceMargin && deltaToLeft >= selfRect.width) {
                            selector = "left";
                        }
                    } else if (classList.contains("popover-top-center")) {
                        if (deltaBottom < graceMargin && spaceToTop >= selfRect.height) {
                            selector = "top";
                        }
                    } else if (classList.contains("popover-top-right")) {
                        if (deltaBottom < graceMargin && deltaToLeft < graceMargin && spaceToTop >= selfRect.height && deltaToRight >= selfRect.width) {
                            selector = "top-and-right";
                        } else if (deltaBottom < graceMargin && spaceToTop >= selfRect.height) {
                            selector = "top";
                        } else if (deltaToLeft < graceMargin && deltaToRight >= selfRect.width) {
                            selector = "right";
                        }
                    }
                    else if (classList.contains("popover-center-left")) {
                        if (deltaToRight < graceMargin && deltaToLeft >= selfRect.width) {
                            selector = "left";
                        }
                    }
                    else if (classList.contains("popover-center-right")) {
                        if (deltaToLeft < graceMargin && deltaToRight >= selfRect.width) {
                            selector = "right";
                        }
                    }
                    else if (classList.contains("popover-bottom-left")) {
                        if (deltaTop < graceMargin && deltaToRight < graceMargin && deltaBottom >= 0 && deltaToLeft >= selfRect.width) {
                            selector = "bottom-and-left";
                        } else if (deltaTop < graceMargin && deltaBottom >= 0) {
                            selector = "bottom";
                        } else if (deltaToRight < graceMargin && deltaToLeft >= selfRect.width) {
                            selector = "left";
                        }
                    } else if (classList.contains("popover-bottom-center")) {
                        if (deltaTop < graceMargin && deltaBottom >= 0) {
                            selector = "bottom";
                        }
                    } else if (classList.contains("popover-bottom-right")) {
                        if (deltaTop < graceMargin && deltaToLeft < graceMargin && deltaBottom >= 0 && deltaToRight >= selfRect.width) {
                            selector = "bottom-and-right";
                        } else if (deltaTop < graceMargin && deltaBottom >= 0) {
                            selector = "bottom";
                        } else if (deltaToLeft < graceMargin && deltaToRight >= selfRect.width) {
                            selector = "right";
                        }
                    }
                }

                if (selector && selector != "none") {
                    const newPosition: PopoverPosition = Popover.getPositionForFlippedPopver(classListArray, selector, boundingRect, selfRect);
                    left = newPosition.left;
                    top = newPosition.top;
                    offsetX = newPosition.offsetX;
                    offsetY = newPosition.offsetY;

                    popoverContentNode.setAttribute("data-popover-flip", "flipped");
                }
                else {
                    popoverContentNode.removeAttribute("data-popover-flip");
                }

                if (classList.contains("popover-overflow-flip-onopen")) {
                    const popoverContentNodeAny = popoverContentNode as any;
                    if (!popoverContentNodeAny.popoverFliped) {
                        popoverContentNodeAny.popoverFliped = selector || "none";
                    }
                }
            }

            if (popoverContentNode.classList.contains("popover-fixed")) {
                // Do nothing.
            }
            else if (window.getComputedStyle(popoverNode).position == "fixed") {
                popoverContentNode.style["position"] = "fixed";
            }
            else {
                offsetX += window.scrollX;
                offsetY += window.scrollY;
            }

            popoverContentNode.style["left"] = (left + offsetX) + "px";
            popoverContentNode.style["top"] = Math.max(top + offsetY, 32) + "px";

            if (window.getComputedStyle(popoverNode).getPropertyValue("z-index") != "auto") {
                popoverContentNode.style["z-index"] = window.getComputedStyle(popoverNode).getPropertyValue("z-index");
                (popoverContentNode as any).skipZIndex = true;
            }
        }
    }

    private static placePopoverByClassSelector(classSelector: string = null): void {
        const items: string[] = Popover.getAllObservedContainers();

        for (let i = 0; i < items.length; i++) {
            const popoverNode: HTMLElement = document.getElementById("popover-" + items[i]);
            Popover.placePopover(popoverNode, classSelector);
        }
    }

    private static placePopoverByNode(target: Element): void {
        const id: string = target.id.substring(15);
        const popoverNode: HTMLElement = document.getElementById("popover-" + id);
        Popover.placePopover(popoverNode);
    }
}

export default Popover;