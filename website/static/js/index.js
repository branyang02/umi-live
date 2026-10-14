window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/umi-spin";
var NUM_INTERP_FRAMES = 120;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    // The source is a turntable video, so dragging scrubs its captured views.
    var spinViewer = document.getElementById('interpolation-image-wrapper');
    var spinSlider = document.getElementById('interpolation-slider');
    var dragStartX = null;
    var dragFrame = 0;
    spinViewer.addEventListener('pointerdown', function(event) {
      dragStartX = event.clientX;
      dragFrame = Number(spinSlider.value);
      spinViewer.setPointerCapture(event.pointerId);
    });
    spinViewer.addEventListener('pointermove', function(event) {
      if (dragStartX === null) return;
      var frameDelta = Math.round((event.clientX - dragStartX) / 3);
      var frame = ((dragFrame + frameDelta) % NUM_INTERP_FRAMES + NUM_INTERP_FRAMES) % NUM_INTERP_FRAMES;
      spinSlider.value = frame;
      setInterpolationImage(frame);
    });
    function stopSpinDrag() { dragStartX = null; }
    spinViewer.addEventListener('pointerup', stopSpinDrag);
    spinViewer.addEventListener('pointercancel', stopSpinDrag);

    bulmaSlider.attach();

})
