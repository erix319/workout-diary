'use strict';

// DOM elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.reset-btn');

// Main app class
class Application {
	#click1 = new Audio('sound/click1.mp3');
	#map;
	#mapEvent;
	#workouts = [];

	constructor() {
		this.#getPosition();

		this.#getLocalStorage();

		form.addEventListener('submit', this.#newWorkout.bind(this));
		inputType.addEventListener('change', this.#toggleField.bind(this));
		containerWorkouts.addEventListener('click', this.#moveToMarker.bind(this));
		resetBtn.addEventListener('click', this.clearWorkouts.bind(this));
	}

	// Get user's geolocation or use fallback coordinates
	#getPosition() {
		if (navigator.geolocation) {
			// Timeout after 3 seconds to fallback if geolocation fails
			const timeout = setTimeout(() => {
				this.#loadMockPosition();
			}, 3000);

			navigator.geolocation.getCurrentPosition(
				(pos) => {
					clearTimeout(timeout);
					this.#loadMap(pos);
				},
				() => {
					clearTimeout(timeout);
					this.#loadMockPosition();
				}
			);
		} else {
			this.#loadMockPosition();
		}
	}

	// Initialize map with coordinates and add tile layer
	#loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;
		const coords = [latitude, longitude];

		this.#map = L.map('map').setView(coords, 15.5);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors',
		}).addTo(this.#map);

		// Store click event and show form when map is clicked
		this.#map.on('click', (event) => this.#showForm(event));

		this.#workouts.forEach((workout) => {
			this.#renderWorkoutMarker(workout);
		});
	}

	// Load map with fallback coordinates
	#loadMockPosition() {
		const fallbackPosition = {
			coords: { latitude: 40.1531361, longitude: 44.5120553 },
		};
		this.#loadMap(fallbackPosition);
	}

	// Display form and store map click event
	#showForm(event) {
		this.#click1.play();
		this.#mapEvent = event;

		form.classList.remove('hidden');
		inputDistance.focus();
	}

	// Toggle between running and cycling input fields
	#toggleField() {
		if (inputType.value === 'running') {
			inputCadence.closest('.form__row').classList.remove('form__row--hidden');
			inputElevation.closest('.form__row').classList.add('form__row--hidden');
		} else {
			inputElevation.closest('.form__row').classList.remove('form__row--hidden');
			inputCadence.closest('.form__row').classList.add('form__row--hidden');
		}
	}

	// Create marker on map and store workout
	#newWorkout(e) {
		e.preventDefault();

		const type = inputType.value.toLowerCase();
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		// Check if inputs are invalid (returns true if has errors)
		const validateInputs = (...inputs) => inputs.some((inp) => !Number.isFinite(inp));
		const allPositive = (...inputs) => inputs.some((inp) => inp < 0);

		if (type === 'running') {
			const cadence = +inputCadence.value;

			if (validateInputs(distance, duration, cadence) || allPositive(distance, duration, cadence))
				return alert('Please enter positive numbers for distance, duration, and cadence.');

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		if (type === 'cycling') {
			const elevation = +inputElevation.value;

			if (validateInputs(distance, duration, elevation) || allPositive(distance, duration))
				return alert('Please enter positive numbers for distance, duration, and elevation.');

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		if (type === 'skiing') {
			const elevation = +inputElevation.value;

			if (validateInputs(distance, duration, elevation) || allPositive(distance, duration))
				return alert('Please enter positive numbers for distance, duration, and elevation.');

			workout = new Skiing([lat, lng], distance, duration, elevation);
		}

		if (type === 'swimming') {
			const elevation = +inputElevation.value;

			if (validateInputs(distance, duration, elevation) || allPositive(distance, duration))
				return alert('Please enter positive numbers for distance, duration, and elevation.');

			workout = new Swimming([lat, lng], distance, duration, elevation);
		}

		this.#workouts.push(workout);

		this.#renderWorkoutMarker(workout);
		this.#renderWorkoutList(workout);
		this.#hideForm();
		this.#setLocalStorage();
	}

	// Render workout marker on map
	#renderWorkoutMarker(workout) {
		L.marker(workout.coords, { opacity: 1 })
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: 'mark-popup',
				})
			)
			.setPopupContent(
				`${workout.workoutEmoji} ${workout.type.charAt(0).toUpperCase() + workout.type.slice(1)} workout, dist: ${workout.distance} km`
			)
			.openPopup();
	}

	#hideForm() {
		// Clear form on submit
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
		form.classList.add('hidden');
	}

	#renderWorkoutList(workout) {
		let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
		<h2 class="workout__title">${workout.description}</h2>
		<div class="workout__details">
			<span class="workout__icon">${workout.workoutEmoji}</span>
			<span class="workout__value">${workout.distance}</span>
			<span class="workout__unit">km</span>
		</div>
		<div class="workout__details">
			<span class="workout__icon">⏱</span>
			<span class="workout__value">${workout.duration}</span>
			<span class="workout__unit">min</span>
		</div>
		<div class="workout__details">
			<span class="workout__icon">⚡️</span>
			<span class="workout__value">${workout.pace.toFixed(1)}</span>
			<span class="workout__unit">${workout.type === 'running' || workout.type === 'skiing' || workout.type === 'swimming' ? 'min/km' : 'km/h'}</span>
		</div>
		<div class="workout__details">
			<span class="workout__icon">🏔️</span>
			<span class="workout__value">TODO</span>
			<span class="workout__unit"></span>
		</div>
		`; // TODO: add automatic elevation calculation on click or pressure or weather

		form.insertAdjacentHTML('afterend', html);
	}

	#moveToMarker(e) {
		const workoutEl = e.target.closest('.workout');
		if (!workoutEl) return;

		const workout = this.#workouts.find((w) => w.id === workoutEl.dataset.id);

		this.#map.setView(workout.coords, 15.5, {
			animate: true,
			pan: { duration: 1 },
		});
	}

	#setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	#getLocalStorage() {
		const workouts = localStorage.getItem('workouts');
		if (!workouts) return;

		this.#workouts = JSON.parse(workouts);

		this.#workouts.forEach((workout) => {
			this.#renderWorkoutList(workout);
		});
	}

	clearWorkouts() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}

// Workout classes
class Workout {
	date = new Date();
	id = (Date.now() + '').slice(-10);

	constructor(coords, distance, duration) {
		this.coords = coords;
		this.distance = distance;
		this.duration = duration;
	}

	setDescription() {
		const months = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		];

		this.description = `${this.type.charAt(0).toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}
}

class Running extends Workout {
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.type = 'running';
		this.workoutEmoji = '🏃‍♂️';
		this.calcPace();
		this.setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	constructor(coords, distance, duration, elevation) {
		super(coords, distance, duration);
		this.elevation = elevation;
		this.type = 'cycling';
		this.workoutEmoji = '🚴‍♂️';
		this.calcPace();
		this.setDescription();
	}

	calcPace() {
		this.pace = this.distance / (this.duration / 60);
		return this.pace;
	}
}

class Skiing extends Workout {
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.type = 'skiing';
		this.workoutEmoji = '⛷️';
		this.calcPace();
		this.setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Swimming extends Workout {
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.type = 'swimming';
		this.workoutEmoji = '🏊‍♂️';
		this.calcPace();
		this.setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

// Running app
const app = new Application();
