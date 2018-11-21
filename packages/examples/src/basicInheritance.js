class Base {
    let x = 1;
}

class Sub extends Base {
    let x;  // unrelated to Base's `x`; this is private to Sub
    let y = 0;

    const getInitialValueForY = () => {
        return 2;
    }

    constructor() {
        super();
        this::y = this::getInitialValueForY();
        console.log(this::x, this::y);
    }
  }
  
  new Sub()
  