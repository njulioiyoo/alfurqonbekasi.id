import { metronicAsset } from "./urls.js";

/** CSS Metronic demo2 — sama seperti `demo2/index.html` (tanpa fullcalendar jika tidak dipakai). */
export const ADMIN_STYLESHEETS: string[] = [
  "vendors/custom/fullcalendar/fullcalendar.bundle.css",
  "vendors/general/perfect-scrollbar/css/perfect-scrollbar.css",
  "vendors/general/tether/dist/css/tether.css",
  "vendors/general/bootstrap-datepicker/dist/css/bootstrap-datepicker3.css",
  "vendors/general/bootstrap-datetime-picker/css/bootstrap-datetimepicker.css",
  "vendors/general/bootstrap-timepicker/css/bootstrap-timepicker.css",
  "vendors/general/bootstrap-daterangepicker/daterangepicker.css",
  "vendors/general/bootstrap-touchspin/dist/jquery.bootstrap-touchspin.css",
  "vendors/general/bootstrap-select/dist/css/bootstrap-select.css",
  "vendors/general/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.css",
  "vendors/general/select2/dist/css/select2.css",
  "vendors/general/ion-rangeslider/css/ion.rangeSlider.css",
  "vendors/general/nouislider/distribute/nouislider.css",
  "vendors/general/owl.carousel/dist/assets/owl.carousel.css",
  "vendors/general/owl.carousel/dist/assets/owl.theme.default.css",
  "vendors/general/dropzone/dist/dropzone.css",
  "vendors/general/summernote/dist/summernote.css",
  "vendors/general/bootstrap-markdown/css/bootstrap-markdown.min.css",
  "vendors/general/animate.css/animate.css",
  "vendors/general/toastr/build/toastr.css",
  "vendors/general/morris.js/morris.css",
  "vendors/general/sweetalert2/dist/sweetalert2.css",
  "vendors/general/socicon/css/socicon.css",
  "vendors/custom/vendors/line-awesome/css/line-awesome.css",
  "vendors/custom/vendors/flaticon/flaticon.css",
  "vendors/custom/vendors/flaticon2/flaticon.css",
  "vendors/general/@fortawesome/fontawesome-free/css/all.min.css",
  "css/demo2/style.bundle.css",
].map((p) => metronicAsset(p));

export const ADMIN_SCRIPT_CHAIN: string[] = [
  "vendors/general/jquery/dist/jquery.js",
  /** Wajib untuk `KTApp.block` / spinner KTDatatable (`$.fn.block` dari plugin ini). */
  "vendors/general/block-ui/jquery.blockUI.js",
  "vendors/general/popper.js/dist/umd/popper.js",
  "vendors/general/bootstrap/dist/js/bootstrap.min.js",
  "vendors/general/bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js",
  "vendors/general/summernote/dist/summernote.js",
  "vendors/general/toastr/build/toastr.min.js",
  "vendors/general/sweetalert2/dist/sweetalert2.min.js",
  "vendors/custom/js/vendors/sweetalert2.init.js",
  /** Untuk dropdown ukuran halaman KTDatatable (`$('.selectpicker').selectpicker()`). */
  "vendors/general/bootstrap-select/dist/js/bootstrap-select.js",
  "vendors/general/js-cookie/src/js.cookie.js",
  "vendors/general/moment/min/moment.min.js",
  "vendors/general/tooltip.js/dist/umd/tooltip.min.js",
  "vendors/general/perfect-scrollbar/dist/perfect-scrollbar.js",
  "vendors/general/sticky-js/dist/sticky.min.js",
  "vendors/general/wnumb/wNumb.js",
  "js/demo2/scripts.bundle.js",
].map((p) => metronicAsset(p));

export const KT_APP_OPTIONS_DEMO2 = `
var KTAppOptions = {
  "colors": {
    "state": {
      "brand": "#374afb",
      "light": "#ffffff",
      "dark": "#282a3c",
      "primary": "#5867dd",
      "success": "#34bfa3",
      "info": "#36a3f7",
      "warning": "#ffb822",
      "danger": "#fd3995"
    },
    "base": {
      "label": ["#c5cbe3", "#a1a8c3", "#3d4465", "#3e4466"],
      "shape": ["#f0f3ff", "#d9dffa", "#afb4d4", "#646c9a"]
    }
  }
};
`;
