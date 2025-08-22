/**
 * Cooking Stations System - Manages different cooking stations and their states
 */

class CookingStation {
    constructor(id, config) {
        this.id = id;
        this.name = config.name;
        this.allowedActions = config.allowedActions;
        this.color = config.color;
        this.cookingSlots = config.cookingSlots || 1;
        this.currentItems = new Map(); // Map of slot index to cooking item
        this.isActive = false;
        this.element = document.getElementById(`${id}-station`);
    }

    // Add item to cooking station
    addItem(slotIndex, item) {
        if (slotIndex >= this.cookingSlots) return false;
        
        this.currentItems.set(slotIndex, {
            ...item,
            startTime: Date.now(),
            cookingTime: item.cookingTime || 3000,
            isReady: false
        });
        
        // Start cooking timer
        setTimeout(() => {
            const cookingItem = this.currentItems.get(slotIndex);
            if (cookingItem) {
                cookingItem.isReady = true;
                this.updateSlotDisplay(slotIndex);
            }
        }, item.cookingTime || 3000);
        
        this.updateSlotDisplay(slotIndex);
        return true;
    }

    // Remove item from cooking station
    removeItem(slotIndex) {
        const item = this.currentItems.get(slotIndex);
        this.currentItems.delete(slotIndex);
        this.updateSlotDisplay(slotIndex);
        return item;
    }

    // Check if station has available slots
    hasAvailableSlot() {
        return this.currentItems.size < this.cookingSlots;
    }

    // Get next available slot
    getNextAvailableSlot() {
        for (let i = 0; i < this.cookingSlots; i++) {
            if (!this.currentItems.has(i)) {
                return i;
            }
        }
        return -1;
    }

    // Update slot display
    updateSlotDisplay(slotIndex) {
        const slotElement = this.element?.querySelector(`#${this.id}-slots .cooking-slot:nth-child(${slotIndex + 1})`);
        if (!slotElement) return;

        const item = this.currentItems.get(slotIndex);
        
        if (!item) {
            slotElement.className = 'cooking-slot';
            slotElement.textContent = 'Empty';
            return;
        }

        if (item.isReady) {
            slotElement.className = 'cooking-slot ready';
            slotElement.innerHTML = `
                <div class="cooked-item-name">${item.name} Ready!</div>
                <div class="retrieve-hint">Press Enter to retrieve</div>
            `;
        } else {
            slotElement.className = 'cooking-slot occupied';
            const timeLeft = Math.ceil((item.cookingTime - (Date.now() - item.startTime)) / 1000);
            slotElement.textContent = `${item.name} (${timeLeft}s)`;
            
            // Update timer every second
            const timer = setInterval(() => {
                if (item.isReady) {
                    clearInterval(timer);
                    return;
                }
                
                const newTimeLeft = Math.ceil((item.cookingTime - (Date.now() - item.startTime)) / 1000);
                if (newTimeLeft > 0) {
                    slotElement.textContent = `${item.name} (${newTimeLeft}s)`;
                } else {
                    clearInterval(timer);
                }
            }, 1000);
        }
    }

    // Activate station (highlight)
    activate() {
        this.isActive = true;
        if (this.element) {
            this.element.classList.add('active');
            this.element.style.borderWidth = '4px';
            this.element.style.boxShadow = '0 0 15px rgba(0, 123, 255, 0.5)';
        }
    }

    // Deactivate station
    deactivate() {
        this.isActive = false;
        if (this.element) {
            this.element.classList.remove('active');
            this.element.style.borderWidth = '3px';
            this.element.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
        }
    }

    // Initialize station display
    initializeDisplay() {
        if (!this.element) return;

        const slotsContainer = this.element.querySelector('.cooking-slots');
        if (!slotsContainer) return;

        slotsContainer.innerHTML = '';
        
        for (let i = 0; i < this.cookingSlots; i++) {
            const slotElement = document.createElement('div');
            slotElement.className = 'cooking-slot';
            slotElement.textContent = 'Empty';
            slotsContainer.appendChild(slotElement);
        }
    }
}

class CookingStationManager {
    constructor(dishSystem) {
        this.dishSystem = dishSystem;
        this.stations = new Map();
        this.activeStation = null;
        this.currentDish = null;
        
        this.initializeStations();
    }

    initializeStations() {
        // Create cooking stations based on dish system configuration
        for (const [stationId, config] of this.dishSystem.cookingStations) {
            const station = new CookingStation(stationId, config);
            this.stations.set(stationId, station);
            station.initializeDisplay();
        }
    }

    // Set active station and dish
    setActiveDish(dishId, stationId = null) {
        this.currentDish = dishId;
        const dish = this.dishSystem.getDish(dishId);
        
        if (!dish) return false;

        // Determine which station to use
        const targetStationId = stationId || dish.station;
        const station = this.stations.get(targetStationId);
        
        if (!station) return false;

        // Deactivate previous station
        if (this.activeStation) {
            this.activeStation.deactivate();
        }

        // Activate new station
        this.activeStation = station;
        station.activate();

        // Update station display
        this.updateStationDisplay(targetStationId, dishId);

        return true;
    }

    // Update station display with current dish
    updateStationDisplay(stationId, dishId) {
        const station = this.stations.get(stationId);
        if (!station || !station.element) return;

        const dish = this.dishSystem.getDish(dishId);
        if (!dish) return;

        // Update current dish display
        const dishDisplay = station.element.querySelector('.current-dish');
        if (dishDisplay) {
            if (stationId === 'prep') {
                // Show ingredient preparation progress
                const totalIngredients = dish.ingredients.filter(ing => dish.currentIngredients.has(ing.id)).length;
                const readyIngredients = Array.from(dish.ingredientStates.values()).filter(state => state.isReady).length;
                
                dishDisplay.innerHTML = `
                    <div class="dish-name" style="background-color: ${dish.baseColor}">${dish.name}</div>
                    <div class="dish-progress">Ingredients: ${readyIngredients}/${totalIngredients} ready</div>
                    <div class="dish-progress">Final: ${dish.finalStepsProgress}/${dish.finalSteps?.length || 0} steps</div>
                `;
            } else {
                dishDisplay.innerHTML = `
                    <div class="dish-name" style="background-color: ${dish.baseColor}">${dish.name}</div>
                    <div class="station-status">Cooking in progress...</div>
                `;
            }
            dishDisplay.classList.add('active');
        }

        // Update ingredients panel for prep station
        if (stationId === 'prep') {
            const ingredientsPanel = station.element.querySelector('.ingredients-panel');
            if (ingredientsPanel) {
                this.updateIngredientsPanel(ingredientsPanel, dish);
            }
        }
    }

    // Update ingredients panel with better workflow display
    updateIngredientsPanel(panel, dish) {
        panel.innerHTML = '';
        
        // Show ingredient workflow
        dish.ingredients.forEach(ingredient => {
            const ingredientData = this.dishSystem.getIngredient(ingredient.id);
            if (!ingredientData) return;
            
            const isAdded = dish.currentIngredients.has(ingredient.id);
            const ingredientState = dish.ingredientStates.get(ingredient.id);
            
            let statusClass = '';
            let statusText = '';
            
            if (!isAdded) {
                statusClass = ingredient.required ? 'needed-required' : 'needed-optional';
                statusText = `Press ${ingredientData.key.toUpperCase()}`;
            } else if (ingredientState && !ingredientState.isReady) {
                const nextStep = ingredient.prepSteps[ingredientState.prepStepsCompleted];
                statusClass = 'needs-prep';
                statusText = `${nextStep.description} (${nextStep.key.toUpperCase()})`;
            } else {
                statusClass = 'ready';
                statusText = 'Ready ✓';
            }
            
            const ingredientElement = document.createElement('div');
            ingredientElement.className = `ingredient-workflow-item ${statusClass}`;
            
            ingredientElement.innerHTML = `
                <div class="ingredient-name">${ingredientData.name}</div>
                <div class="ingredient-status">${statusText}</div>
                ${ingredient.required ? '<div class="required-marker">*</div>' : ''}
            `;
            
            panel.appendChild(ingredientElement);
        });
        
        // Show final assembly steps if ingredients are ready
        const readyRequired = dish.ingredients
            .filter(ing => ing.required)
            .every(ing => {
                const state = dish.ingredientStates.get(ing.id);
                return state && state.isReady;
            });
            
        if (readyRequired && dish.finalSteps) {
            const finalStepsTitle = document.createElement('div');
            finalStepsTitle.className = 'final-steps-title';
            finalStepsTitle.textContent = 'Final Assembly:';
            panel.appendChild(finalStepsTitle);
            
            dish.finalSteps.forEach((step, index) => {
                const isDone = index < dish.finalStepsProgress;
                const isCurrent = index === dish.finalStepsProgress;
                
                const stepElement = document.createElement('div');
                stepElement.className = `final-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`;
                
                stepElement.innerHTML = `
                    <div class="step-name">${step.description}</div>
                    <div class="step-key">${isDone ? '✓' : step.key.toUpperCase()}</div>
                `;
                
                panel.appendChild(stepElement);
            });
        }
    }

    // Handle cooking action (for stations with cooking slots)
    handleCookingAction(action, ingredient) {
        if (!this.activeStation || !this.currentDish) return false;

        const dish = this.dishSystem.getDish(this.currentDish);
        if (!dish) return false;

        // Check if action is allowed on this station
        if (!this.activeStation.allowedActions.includes(action)) {
            console.warn(`Action ${action} not allowed on station ${this.activeStation.id}`);
            return false;
        }

        // For cooking stations (grill, fryer, stove), add item to cooking slot
        if (this.activeStation.cookingSlots > 1) {
            const slotIndex = this.activeStation.getNextAvailableSlot();
            if (slotIndex === -1) {
                console.warn(`No available slots on station ${this.activeStation.id}`);
                return false;
            }

            // Find cooking time from ingredient prep steps
            let cookingTime = 3000; // default
            const ingredientConfig = dish.ingredients.find(ing => ing.id === ingredient);
            if (ingredientConfig && ingredientConfig.prepSteps) {
                const step = ingredientConfig.prepSteps.find(s => s.action === action);
                if (step && step.time) {
                    cookingTime = step.time;
                }
            }

            const ingredientData = this.dishSystem.getIngredient(ingredient);
            const cookingItem = {
                name: ingredientData ? ingredientData.name : ingredient,
                action: action,
                ingredient: ingredient,
                cookingTime: cookingTime
            };

            return this.activeStation.addItem(slotIndex, cookingItem);
        }

        return true;
    }

    // Remove cooked item from station
    removeCookedItem(stationId, slotIndex) {
        const station = this.stations.get(stationId);
        if (!station) return null;

        const item = station.currentItems.get(slotIndex);
        if (!item || !item.isReady) return null;

        return station.removeItem(slotIndex);
    }

    // Get station by ID
    getStation(stationId) {
        return this.stations.get(stationId);
    }

    // Get all stations
    getAllStations() {
        return Array.from(this.stations.values());
    }

    // Check if any cooking items are ready
    getReadyItems() {
        const readyItems = [];
        
        for (const station of this.stations.values()) {
            for (const [slotIndex, item] of station.currentItems) {
                if (item.isReady) {
                    readyItems.push({
                        stationId: station.id,
                        slotIndex: slotIndex,
                        item: item
                    });
                }
            }
        }
        
        return readyItems;
    }

    // Clear current dish
    clearCurrentDish() {
        if (this.activeStation) {
            this.activeStation.deactivate();
            
            // Clear station display
            if (this.activeStation && this.activeStation.element) {
                const dishDisplay = this.activeStation.element.querySelector('.current-dish');
                if (dishDisplay) {
                    if (this.activeStation.id === 'prep') {
                        dishDisplay.innerHTML = '<div class="dish-placeholder">Select a dish to prepare</div>';
                        const ingredientsPanel = this.activeStation.element.querySelector('.ingredients-panel');
                        if (ingredientsPanel) {
                            ingredientsPanel.innerHTML = '';
                        }
                    } else {
                        dishDisplay.innerHTML = `<div class="dish-placeholder">${this.activeStation.name} ready</div>`;
                    }
                    dishDisplay.classList.remove('active');
                }
            }
        }
        
        this.activeStation = null;
        this.currentDish = null;
    }
}

// Global cooking station manager will be initialized by the game
window.CookingStationManager = CookingStationManager;
