<script setup lang="ts">
const B = "/bismillah/assets";
</script>

<template>
  <!-- Slider -->
  <section>
    <div class="gap no-gap">
      <img class="botm-shp shp-img" :src="`${B}/images/shp1g.png`" alt="" />
      <div class="featured-area-wrap text-center">
        <div class="featured-area owl-carousel">
          <div class="featured-item" :style="{ backgroundImage: `url(${B}/images/resources/slide-4.jpg)` }">
            <div class="featured-cap">
              <img :src="`${B}/images/resources/bsml-txt.png`" alt="" />
              <h1><img :src="`${B}/images/resources/ayat-txt.png`" alt="" /></h1>
              <img class="before-imge" :src="`${B}/images/pshapeg.png`" alt="" />
              <h3>Selamat Datang di Masjid Alfurqon Bekasi</h3>
              <span>Pusat Informasi & Kegiatan Masjid</span>
              <a class="theme-btn theme-bg brd-rd5" href="#" title="">Selengkapnya</a>
            </div>
          </div>
          <div class="featured-item" :style="{ backgroundImage: `url(${B}/images/resources/slide3.jpg)` }">
            <div class="featured-cap">
              <img :src="`${B}/images/resources/bsml-txt2.png`" alt="" />
              <h1><img :src="`${B}/images/resources/ayat-txt.png`" alt="" /></h1>
              <img class="before-imge" :src="`${B}/images/pshapeg.png`" alt="" />
              <h3>Masjid untuk Semua Umat</h3>
              <span>Jadwal Kajian, Donasi, dan Informasi Kegiatan</span>
              <a class="theme-btn theme-bg brd-rd5" href="#" title="">Selengkapnya</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Layanan -->
  <section>
    <div class="gap white-layer opc7">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax1.jpg)` }"></div>
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Melayani Jamaah dengan Sepenuh Hati</span>
          <h2>Layanan Kami</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="serv-wrp remove-ext3">
          <div class="row">
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-open-book theme-clr"></i>
                <h5><a href="#" title="">Kajian & Pengajian</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Kajian rutin harian, mingguan dan bulanan bersama ustadz-ustadz pilihan.</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-grave theme-clr"></i>
                <h5><a href="#" title="">Layanan Jenazah</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Pengurusan jenazah lengkap dari memandikan hingga pemakaman.</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-mosque theme-clr"></i>
                <h5><a href="#" title="">TPQ Alfurqon</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Pendidikan Al-Quran untuk anak-anak dengan metode pembelajaran modern.</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-begging theme-clr"></i>
                <h5><a href="#" title="">Qurban & Zakat</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Penerimaan dan penyaluran qurban serta zakat untuk yang membutuhkan.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Galeri -->
  <section>
    <div class="gap black-layer opc8 white-testi">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax2.jpg)` }"></div>
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Kenangan Indah</span>
          <h2>Galeri Kegiatan</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="gallery-wrap">
          <div class="row mrg10">
            <div v-for="n in 8" :key="n" class="col-md-3 col-sm-6 col-lg-3">
              <div class="gallery-item brd-rd5">
                <a :href="`${B}/images/resources/gallery-img2-${n}.jpg`" data-fancybox="gallery" title="">
                  <img :src="`${B}/images/resources/gallery-img2-${n}.jpg`" :alt="`gallery-${n}`" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
