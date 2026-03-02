document.querySelectorAll(".slider").forEach((slider) => {
  const images = slider.querySelectorAll(".slides img");
  const prevBtn = slider.querySelector(".prev");
  const nextBtn = slider.querySelector(".next");

  if (images.length === 0) return;

  // Wenn nur ein Bild: Buttons optional ausblenden
  if (images.length === 1) {
    slider.classList.add("is-single");
    images[0].classList.add("active");
    return;
  }

  let index = 0;

  function show(i) {
    images.forEach((img) => img.classList.remove("active"));
    images[i].classList.add("active");
  }

  prevBtn.addEventListener("click", () => {
    index = (index - 1 + images.length) % images.length;
    show(index);
  });

  nextBtn.addEventListener("click", () => {
    index = (index + 1) % images.length;
    show(index);
  });

  // optional: Keyboard support wenn Slider fokussiert ist
  slider.tabIndex = 0;
  slider.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
  });

  // initial
  show(index);
});