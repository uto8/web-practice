
const defaultProfileImageURL = 'img/default-profile-image.png';


const defaultRoomName = 'room1';


let currentRoomName = null;


let currentUID;


let dbdata = {};


const formatDate = (date) => {
  const m = moment(date);
  return `${m.format('YYYY/MM/DD')}&nbsp;&nbsp;${m.format('HH:mm:ss')}`;
};




const resetSettingsModal = () => {
  $('#settings-form')[0].reset();
};


const updateNicknameDisplay = (uid) => {
  const user = dbdata.users[uid];
  if (user) {
    $(`.nickname-${uid}`).text(user.nickname);
    if (uid === currentUID) {
      $('#menu-profile-name').text(user.nickname);
    }
  }
};


const updateProfileImageDisplay = (uid, url) => {
  $(`.profile-image-${uid}`).attr({
    src: url,
  });
  if (uid === currentUID) {
    $('#menu-profile-image').attr({
      src: url,
    });
  }
};


const downloadProfileImage = (uid) => {
  const user = dbdata.users[uid];
  if (!user) {
    return;
  }
  if (user.profileImageLocation) {

    firebase
      .storage()
      .ref(user.profileImageLocation)
      .getDownloadURL()
      .then((url) => {

        user.profileImageURL = url;
        updateProfileImageDisplay(uid, url);
      })
      .catch((error) => {
        console.error('写真のダウンロードに失敗:', error);
        user.profileImageURL = defaultProfileImageURL;
        updateProfileImageDisplay(uid, defaultProfileImageURL);
      });
  } else {

    user.profileImageURL = defaultProfileImageURL;
    updateProfileImageDisplay(uid, defaultProfileImageURL);
  }
};


const createFavoriteMessageDiv = (messageId, message) => {

  const divTag = $('.favorite-template .list-group-item').clone();

  const user = dbdata.users[message.uid];
  if (user) {

    divTag
      .find('.favorite__user-name')
      .addClass(`nickname-${message.uid}`)
      .text(user.nickname);

    divTag.find('.favorite__user-image').addClass(`profile-image-${message.uid}`);

    if (user.profileImageURL) {

      divTag.find('.favorite__user-image').attr({
        src: user.profileImageURL,
      });
    }
  }

  divTag.find('.favorite__text').text(message.text);

  divTag.find('.favorite__time').html(formatDate(new Date(message.time)));


  divTag.attr('id', `favorite-message-id-${messageId}`);

  return divTag;
};


const addFavoriteMessage = (messageId, message) => {
  const divTag = createFavoriteMessageDiv(messageId, message);
  divTag.appendTo('#favorite-list');
};


const toggleFavorite = (e) => {
  const { messageId, message } = e.data;

  e.preventDefault();


  if (dbdata.favorites && dbdata.favorites[messageId]) {

    firebase
      .database()
      .ref(`favorites/${currentUID}/${messageId}`)
      .remove();
  } else {

    firebase
      .database()
      .ref(`favorites/${currentUID}/${messageId}`)
      .set(
        {
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          message: message,
        },
      );
  }
};


const resetFavoritesListModal = () => {
  $('#favorite-list').empty();
};


const createMessageDiv = (messageId, message) => {

  let divTag = null;
  if (message.uid === currentUID) {

    divTag = $('.message-template .message--sent').clone();
  } else {

    divTag = $('.message-template .message--received').clone();
  }

  const user = dbdata.users[message.uid];


  if (user) {

    divTag
      .find('.message__user-name')
      .addClass(`nickname-${message.uid}`)
      .text(user.nickname);

    divTag.find('.message__user-image').addClass(`profile-image-${message.uid}`);
    if (user.profileImageURL) {

      divTag.find('.message__user-image').attr({
        src: user.profileImageURL,
      });
    }
  }

  divTag.find('.message__text').text(message.text);

  divTag.find('.message__time').html(formatDate(new Date(message.time)));


  divTag.attr('id', `message-id-${messageId}`);


  const mfl = divTag.find('.message__favorite-link');
  mfl.on(
    'click',
    {
      messageId,
      message,
    },
    toggleFavorite,
  );

  if(mfl.on){
    $(`#message-id-${messageId}`)
      .find(".message__favorite-icon")
      .removeClass("fa-star-o")
      .addClass("fa-star");
  }
　
  return divTag;
};


const addMessage = (messageId, message) => {
  const divTag = createMessageDiv(messageId, message);
  divTag.appendTo('#message-list');


  $('html, body').scrollTop($(document).height());
};


const clearRoomList = () => {
  $('#room-list')
    .find('.room-list-dynamic')
    .remove();
};

const clearNavbar = () => {
  $('.room-list-menu').text('ルーム');
  $('#menu-profile-name').text('');
  $('#menu-profile-image').attr({
    src: defaultProfileImageURL,
  });
  clearRoomList();
};

const showRoomList = (roomsSnapshot) => {

  clearRoomList();

  roomsSnapshot.forEach((roomSnapshot) => {
    const roomName = roomSnapshot.key;
    const roomListLink = $('<a>', {
      href: `#${roomName}`,
      class: 'dropdown-item room-list__link room-list-dynamic',
    }).text(roomName);
    roomListLink.on('click', () => {
      $('#navbarSupportedContent').collapse('hide');
    });
    $('#room-list').append(roomListLink);
  });
};

const clearMessages = () => {
  $('#message-list').empty();
};


const resetChatView = () => {
  clearMessages();


  clearNavbar();


  $('#settings-profile-image-preview').attr({
    src: defaultProfileImageURL,
  });
};

const changeLocationHash = (roomName) => {
  window.location.hash = encodeURIComponent(roomName);
};

const showRoom = (roomName) => {
  if (!dbdata.rooms || !dbdata.rooms[roomName]) {
    console.error('該当するルームがありません:', roomName);
    return;
  }
  currentRoomName = roomName;
  clearMessages();

  const roomRef = firebase.database().ref(`messages/${roomName}`);

  roomRef.off('child_added');

  roomRef.on('child_added', (childSnapshot) => {
    if (roomName === currentRoomName) {
      addMessage(childSnapshot.key, childSnapshot.val());
    }
  });

  $('.room-list-menu').text(`ルーム: ${roomName}`);

  if (roomName === defaultRoomName) {
    $('#delete-room-menuitem').addClass('disabled');
  } else {
    $('#delete-room-menuitem').removeClass('disabled');
  }

  $('#room-list > a').removeClass('active');
  $(`.room-list__link[href='#${roomName}']`).addClass('active');
};

const showCurrentRoom = () => {
  if (currentRoomName) {
    if (!dbdata.rooms[currentRoomName]) {
      changeLocationHash(defaultRoomName);
    }
  } else {

    const { hash } = window.location;
    if (hash) {

      const roomName = decodeURIComponent(hash.substring(1));
      if (dbdata.rooms[roomName]) {
        showRoom(roomName);
      } else {

        changeLocationHash(defaultRoomName);
      }
    } else {

      changeLocationHash(defaultRoomName);
    }
  }
};


const setMessageListMinHeight = () => {
  $('#message-list').css({

    'min-height': `${$(window).height() - 51 - 46 + 6}px`,
  });
};

const resetCreateRoomModal = () => {
  $('#create-room-form')[0].reset();
  $('#create-room__room-name').removeClass('has-error');
  $('#create-room__help').hide();
};


const deleteRoom = (roomName) => {

  if (roomName === defaultRoomName) {
    throw new Error(`${defaultRoomName}ルームは削除できません`);
  }

  firebase
    .database()
    .ref(`rooms/${roomName}`)
    .remove();

  firebase
    .database()
    .ref(`messages/${roomName}`)
    .remove();
};

const loadChatView = () => {
  resetChatView();

  dbdata = {};

  const usersRef = firebase.database().ref('users');
  usersRef.off('value');
  usersRef.on('value', (usersSnapshot) => {

    dbdata.users = usersSnapshot.val();

    if (dbdata.users === null || !dbdata.users[currentUID]) {
      const { currentUser } = firebase.auth();
      if (currentUser) {
        console.log('ユーザデータを作成します');
        firebase
          .database()
          .ref(`users/${currentUID}`)
          .set({
            nickname: currentUser.email,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
          });

        return;
      }
    }

    Object.keys(dbdata.users).forEach((uid) => {
      updateNicknameDisplay(uid);
      downloadProfileImage(uid);
    });

    if (currentRoomName === null && dbdata.rooms) {
      showCurrentRoom();
    }
  });

  const roomsRef = firebase.database().ref('rooms');

  roomsRef.off('value');

  roomsRef.on('value', (roomsSnapshot) => {

    dbdata.rooms = roomsSnapshot.val();

    if (dbdata.rooms === null || !dbdata.rooms[defaultRoomName]) {
      console.log(`${defaultRoomName}ルームを作成します`);
      firebase
        .database()
        .ref(`rooms/${defaultRoomName}`)
        .setWithPriority(
          {
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdByUID: currentUID,
          },
          1,
        );

      return;
    }

    showRoomList(roomsSnapshot);

    if (!dbdata.users) {
      return;
    }

    showCurrentRoom();
  });

  const favoritesRef = firebase
    .database()
    .ref(`favorites/${currentUID}`)
    .orderByChild('createdAt');

  favoritesRef.off('child_removed');
  favoritesRef.off('child_added');


  favoritesRef.on('child_removed', (favSnapshot) => {
    const messageId = favSnapshot.key;

    if (!dbdata.favorites) {
      return;
    }

    delete dbdata.favorites[messageId];

    $(`#favorite-message-id-${messageId}`).remove();

    $(`#message-id-${messageId}`)
      .find(".message__favorite-icon")
      .addClass("fa-star-o")
      .removeClass("fa-star");
  });


  favoritesRef.on('child_added', (favSnapshot) => {
    const messageId = favSnapshot.key;
    const favorite = favSnapshot.val();

    if (!dbdata.favorites) {

      dbdata.favorites = {};
    }


    dbdata.favorites[messageId]=favorite;


    addFavoriteMessage(messageId, favorite.message);


    $(`#message-id-${messageId}`)
      .find(".message__favorite-icon")
      .removeClass("fa-star-o")
      .addClass("fa-star");
    console.log(`#message-id-${messageId}`);
  });
};


const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'chat') {
    loadChatView();
  }
};


const resetLoginForm = () => {
  $('#login-form > .form-group').removeClass('has-error');
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

const onLogin = () => {
  console.log('ログイン完了');

  showView('chat');
};

const onLogout = () => {
  firebase
    .database()
    .ref('users')
    .off('value');
  firebase
    .database()
    .ref('rooms')
    .off('value');
  currentRoomName = null;
  dbdata = {};
  resetLoginForm();
  resetChatView();
  resetSettingsModal();
  resetFavoritesListModal();
  showView('login');
};


const onWeakPassword = () => {
  resetLoginForm();
  $('#login__password').addClass('has-error');
  $('#login__help')
    .text('6文字以上のパスワードを入力してください')
    .fadeIn();
};


const onWrongPassword = () => {
  resetLoginForm();
  $('#login__password').addClass('has-error');
  $('#login__help')
    .text('正しいパスワードを入力してください')
    .fadeIn();
};

const onTooManyRequests = () => {
  resetLoginForm();
  $('#login__submit-button').prop('disabled', true);
  $('#login__help')
    .text('試行回数が多すぎます。後ほどお試しください。')
    .fadeIn();
};

const onInvalidEmail = () => {
  resetLoginForm();
  $('#login__email').addClass('has-error');
  $('#login__help')
    .text('メールアドレスを正しく入力してください')
    .fadeIn();
};

const onOtherLoginError = () => {
  resetLoginForm();
  $('#login__help')
    .text('ログインに失敗しました')
    .fadeIn();
};


const catchErrorOnCreateUser = (error) => {

  console.error('ユーザ作成に失敗:', error);
  if (error.code === 'auth/weak-password') {
    onWeakPassword();
  } else {

    onOtherLoginError(error);
  }
};


const catchErrorOnSignIn = (error) => {
  if (error.code === 'auth/wrong-password') {

    onWrongPassword();
  } else if (error.code === 'auth/too-many-requests') {

    onTooManyRequests();
  } else if (error.code === 'auth/invalid-email') {

    onInvalidEmail();
  } else {

    onOtherLoginError(error);
  }
};

firebase.auth().onAuthStateChanged((user) => {


  if (user) {

    currentUID = user.uid;
    onLogin();
  } else {

    currentUID = null;
    onLogout();
  }
});

$('#login-form').on('submit', (e) => {
  e.preventDefault();

  resetLoginForm();

  $('#login__submit-button')
    .prop('disabled', true)
    .text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();


  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .catch((error) => {
      console.log('ログイン失敗:', error);
      if (error.code === 'auth/user-not-found') {

        firebase
          .auth()
          .createUserWithEmailAndPassword(email, password)
          .then(() => {

            console.log('ユーザを作成しました');
          })
          .catch(catchErrorOnCreateUser);
      } else {
        catchErrorOnSignIn(error);
      }
    });
});

$('#logout__link').on('click', (e) => {
  e.preventDefault();

  $('#navbarSupportedContent').collapse('hide');

  firebase
    .auth()
    .signOut()
    .then(() => {

      window.location.hash = '';
    })
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});



$('#comment-form').on('submit', (e) => {
  const commentForm = $('#comment-form__text');
  const comment = commentForm.val();

  e.preventDefault();

  if (comment === '') {
    return;
  }
  commentForm.val('');

  const message = {
    uid: currentUID,
    text: comment,
    time: firebase.database.ServerValue.TIMESTAMP,
  };
  firebase
    .database()
    .ref(`messages/${currentRoomName}`)
    .push(message);
});

setMessageListMinHeight();



$('#createRoomModal').on('show.bs.modal', () => {

  resetCreateRoomModal();
});
$('#createRoomModal').on('shown.bs.modal', () => {

  $('#navbarSupportedContent').collapse('hide');

  $('#room-name').trigger('focus');
});

$('#create-room-form').on('submit', (e) => {
  const roomName = $('#room-name')
    .val()
    .trim();
  $('#room-name').val(roomName);

  e.preventDefault();


  if (/[.$#[\]/]/.test(roomName)) {
    $('#create-room__help')
      .text('ルーム名に次の文字は使えません: . $ # [ ] /')
      .fadeIn();
    $('#create-room__room-name').addClass('has-error');
    return;
  }

  if (roomName.length < 1 || roomName.length > 20) {
    $('#create-room__help')
      .text('1文字以上20文字以内で入力してください')
      .fadeIn();
    $('#create-room__room-name').addClass('has-error');
    return;
  }

  if (dbdata.rooms[roomName]) {
    $('#create-room__help')
      .text('同じ名前のルームがすでに存在します')
      .fadeIn();
    $('#create-room__room-name').addClass('has-error');
    return;
  }


  firebase
    .database()
    .ref(`rooms/${roomName}`)
    .setWithPriority(
      {
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdByUID: currentUID,
      },
      2,
    )
    .then(() => {

      $('#createRoomModal').modal('toggle');


      changeLocationHash(roomName);
    })
    .catch((error) => {
      console.error('ルーム作成に失敗:', error);
    });
});


$('#deleteRoomModal').on('show.bs.modal', (e) => {

  if (!currentRoomName) {
    e.preventDefault();
  }


  if (currentRoomName === defaultRoomName) {
    e.preventDefault();
  }


  $('#delete-room__name').text(currentRoomName);


  $('#navbarSupportedContent').collapse('hide');
});


$('#delete-room__button').on('click', () => {
  deleteRoom(currentRoomName);
  $('#deleteRoomModal').modal('toggle');
});


$('#settingsModal').on('show.bs.modal', (e) => {

  if (!dbdata.users) {
    e.preventDefault();
  }

  $('#navbarSupportedContent').collapse('hide');

  $('#settings-nickname').val(dbdata.users[currentUID].nickname);

  const user = dbdata.users[currentUID];
  if (user.profileImageURL) {

    $('#settings-profile-image-preview').attr({
      src: user.profileImageURL,
    });
  } else if (user.profileImageLocation) {

    firebase
      .storage()
      .ref(`profile-images/${currentUID}`)
      .getDownloadURL()
      .then((url) => {
        $('#settings-profile-image-preview').attr({
          src: url,
        });
      });
  }
});

$('#settings-nickname').on('change', (e) => {
  const newName = $(e.target).val();
  if (newName.length === 0) {

    return;
  }
  firebase
    .database()
    .ref(`users/${currentUID}`)
    .update({
      nickname: newName,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    });
});


$('#settings-profile-image').on('change', (e) => {
  const input = e.target;
  const { files } = input;
  if (files.length === 0) {

    return;
  }

  const file = files[0];
  const metadata = {
    contentType: file.type,
  };


  $('#settings-profile-image-preview').hide();
  $('#settings-profile-image-loading-container').css({
    display: 'inline-block',
  });


  firebase
    .storage()
    .ref(`profile-images/${currentUID}`)
    .put(file, metadata)
    .then(() => {

      firebase
        .storage()
        .ref(`profile-images/${currentUID}`)
        .getDownloadURL()
        .then((url) => {

          $('#settings-profile-image-preview').on('load', (evt) => {
            $('#settings-profile-image-loading-container').css({
              display: 'none',
            });
            $(evt.target).show();
          });
          $('#settings-profile-image-preview').attr({
            src: url,
          });


          firebase
            .database()
            .ref(`users/${currentUID}`)
            .update({
              profileImageLocation: `profile-images/${currentUID}`,
              updatedAt: firebase.database.ServerValue.TIMESTAMP,
            });
        });
    })
    .catch((error) => {
      console.error('プロフィール画像のアップロードに失敗:', error);
    });
});


$('#settings-profile-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#settings-profile-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('ファイルを選択');
  }
});

$('#settings-form').on('submit', (e) => {
  e.preventDefault();
});

$(window).on('hashchange', () => {
  if (window.location.hash.length > 1) {
    showRoom(decodeURIComponent(window.location.hash.substring(1)));
  }
});

$(window).on('resize', setMessageListMinHeight);
